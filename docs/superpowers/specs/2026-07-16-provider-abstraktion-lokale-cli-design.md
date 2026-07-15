# Provider-Abstraktion & lokale CLI-Läufe

- **Datum:** 2026-07-16
- **Status:** Entwurf, vom Nutzer freigegeben
- **Nachfolge-Spec:** Cloud-Provider (OpenAI, Gemini) — siehe „Bewusst außerhalb des Umfangs"

## Problem

Die Provider-Auswahl an einem Agenten ist heute wirkungslos. Zwei Ursachen:

1. **Die Liste ist erfunden.** `src/store/seed.ts` enthält eine hartkodierte `PROVIDERS`-Liste
   (`opencode`, `Claude Code`, `aider`, `Ollama · llama-3.3`, `gpt-4o`, `gemini-2.5-pro`). Im
   Server existiert **keine Zeile Code** für lokale Provider. `Ollama · llama-3.3` ist ein fester
   Text, keine Abfrage. Ob ein Werkzeug installiert ist, wird nie geprüft.
2. **Der Runner verzweigt nicht.** `server/src/agent/runner.ts` kennt genau einen Weg: die
   Anthropic-API via `ORCHESTRA_MODEL` (Default `claude-opus-4-8`). Das Feld `agent.provider`
   wird nirgends ausgewertet.

Dazu ein Fake-Status: `src/store/useDerived.ts:498` berechnet die Verbindungsanzeige als
`const connected = p.id !== 'gemini-2.5-pro'` — deshalb meldet die Einstellungsseite für jedes
Werkzeug „Verbunden", auch für nicht installierte.

**Ziel:** Die Liste zeigt, was auf der Maschine wirklich verfügbar ist, und die Auswahl eines
lokalen CLI-Agenten führt zu einem echten Lauf dieser CLI.

## Getroffene Entscheidungen

| Frage | Entscheidung |
|---|---|
| Was heißt „lokale Modelle"? | Die CLI-Agenten `opencode` und `claude-code`, nicht Ollama-Modelle |
| Wirkung der Auswahl | Echter CLI-Lauf als Subprozess, Live-Stream ins Ticket |
| Betriebsmodell | Nur lokal, Einzelnutzer — kein Sandboxing nötig |
| Arbeitsverzeichnis | Pro Projekt konfigurierbar |
| Schreibrechte | Erlaubt (`acceptEdits`) |
| Cloud-Provider (gpt-4o, gemini) | Sollen echt angebunden werden — **eigene, spätere Spec** |
| Tests | Vitest für Frontend und Server |

## Umfeld (verifiziert am 2026-07-16)

Auf der Zielmaschine tatsächlich vorgefunden:

- `claude` → `C:\Users\nuVo\.local\bin\claude`, Version 2.1.210
- `opencode` → `C:\Program Files\nodejs\opencode`, Version 1.15.12
- `aider` → nicht installiert
- Ollama läuft (Port 11434, v0.31.2), hat aber **keine Modelle** (`ollama list` ist leer)

Beide CLIs unterstützen strukturierte Headless-Ausgabe:

```
claude --print --output-format stream-json --permission-mode acceptEdits
       --append-system-prompt <text> <prompt>
opencode run --format json --dir <pfad> --dangerously-skip-permissions <message>
```

## Architektur

Eine schmale Schnittstelle, hinter der jeder Provider verschwindet:

```ts
// server/src/agent/providers/types.ts
export interface Detection {
  available: boolean
  version?: string
  reason?: string        // warum nicht verfügbar — wird in der UI gezeigt
}
export interface RunContext {
  project: Project; agent: Agent; ticket: Ticket
  signal: AbortSignal
}
export interface RunSummary { outputTokens: number }

export interface ProviderAdapter {
  id: string
  kind: 'cloud' | 'local'
  label: string
  detect(): Promise<Detection>
  run(ctx: RunContext): AsyncGenerator<ActivityStep, RunSummary>
}
```

`run` yielded Schritte während sie entstehen und returned am Ende die Zusammenfassung. Damit ist
der Unterschied zwischen SDK-Schleife und Subprozess-Stream von außen unsichtbar: beides ist „eine
Folge von Schritten, dann ein Ergebnis".

`runner.ts` schrumpft auf Orchestrierung:

```ts
const adapter = registry.get(agent.provider)
const it = adapter.run(ctx)
for (let r = await it.next(); !r.done; r = await it.next()) {
  append(r.value)              // persistieren + SSE broadcasten
}
// r.value === RunSummary
```

Persistenz, SSE-Broadcast, `running`-Sperre, Laufzeitmessung und Ticket-Statuslogik **bleiben in
`runner.ts`** — sie sind providerunabhängig und funktionieren heute. Herausgezogen wird nur das
„wie rede ich mit dem Modell".

### Neue Dateien

| Datei | Aufgabe | Abhängigkeiten |
|---|---|---|
| `server/src/agent/providers/types.ts` | Schnittstelle | keine |
| `server/src/agent/providers/anthropic.ts` | Heutige Schleife, unverändert herausgezogen | `@anthropic-ai/sdk` |
| `server/src/agent/providers/cli.ts` | Generischer Subprozess-Adapter | `node:child_process` |
| `server/src/agent/providers/registry.ts` | Katalog + Erkennung, gecacht | die drei darüber |

`claude` und `opencode` sind **nicht** zwei Adapter, sondern eine Implementierung mit zwei
Konfigurationen (Kommando, Argument-Bau, Event-Mapping). Ein weiteres Werkzeug ist künftig ein
Objektliteral, keine neue Datei.

## Erkennung

Jeder Adapter beantwortet `detect()` selbst:

- **Anthropic:** `available = !!process.env.ANTHROPIC_API_KEY` (ein `ant auth login`-Profil zählt
  ebenfalls — ein leerer `ANTHROPIC_API_KEY` bedeutet nicht zwingend „keine Credentials"). Ist
  authentifiziert, liefert die **Models-API** (`client.models.list()`) die real nutzbaren Modelle —
  siehe unten.
- **CLI:** Kommando im PATH auflösen, `--version` mit kurzem Timeout starten, Exit-Code 0 heißt
  verfügbar, Versionsausgabe nach `version`. Sonst `reason` füllen (z. B. „nicht im PATH gefunden").

### Cloud-Modelle werden erkannt, nicht gepflegt

Die heutige Liste in `src/store/seed.ts` enthält **ungültige Modell-IDs**: `claude-sonnet-4.5` und
`claude-opus-4.1` schreiben die Version mit Punkt; gültige IDs verwenden Bindestriche
(`claude-sonnet-4-5`, `claude-opus-4-1`). Diese Strings würden mit **404** fehlschlagen, sobald die
Auswahl tatsächlich an die API ginge — unentdeckt geblieben nur, weil `runner.ts` das Feld ignoriert.
Eine handgepflegte Liste veraltet ohnehin bei jedem Modell-Release.

Deshalb erkennt der Anthropic-Adapter seine Modelle **live**: `client.models.list()` liefert je
Modell `id`, `display_name`, `max_input_tokens` und `capabilities`. Ein Provider-Eintrag pro
zurückgegebenem Modell, `label` aus `display_name`. Damit gilt für Cloud dasselbe Prinzip wie für
lokale CLIs: angezeigt wird, was wirklich verfügbar ist.

**Und die Auswahl wirkt.** `agent.provider` ist bei Cloud-Providern die Modell-ID und wird als
`model` an die Messages-API durchgereicht — statt wie heute stets `ORCHESTRA_MODEL`. Sonst bliebe die
Wahl zwischen Opus und Sonnet genau die Fassade, die diese Spec beseitigt. `ORCHESTRA_MODEL` wird zum
Default für Agenten ohne gesetzten Provider; Default-Wert bleibt `claude-opus-4-8`.

**Windows-Fallstrick:** `opencode` liegt unter `C:\Program Files\nodejs\opencode` — das ist ein
Shim, der echte Einstiegspunkt ist eine `.cmd`. Node's `spawn` findet das ohne `shell: true` (bzw.
ohne explizite `.cmd`-Auflösung) nicht. Gilt für Erkennung **und** Lauf.

Ergebnisse werden mit kurzer TTL gecacht, damit ein frisch installiertes Werkzeug ohne
Serverneustart auftaucht.

### Neuer Endpunkt

`GET /api/providers`:

```json
[ { "id": "claude-code", "label": "Claude Code", "kind": "local",
    "available": true, "version": "2.1.210" },
  { "id": "aider", "label": "aider", "kind": "local",
    "available": false, "reason": "nicht im PATH gefunden" } ]
```

### Frontend-Folgen

- `PROVIDERS` verschwindet aus `src/store/seed.ts`; die Liste kommt vom Server in den State.
- `useDerived.ts:498` (`const connected = p.id !== 'gemini-2.5-pro'`) wird durch das echte
  `available` ersetzt.
- Im Agenten-Dialog erscheinen unter „Lokal / CLI" nur verfügbare CLIs; nicht verfügbare werden
  mit `reason` angezeigt, aber nicht auswählbar.

## Arbeitsverzeichnis

- Neue Spalte `workdir TEXT` in `projects`, neues Feld in den Projekt-Einstellungen.
- **Serverseitige Validierung** beim Speichern: Pfad existiert und ist ein Verzeichnis. Der Browser
  kann das Dateisystem des Servers nicht sehen, also darf die Prüfung nicht dort liegen.
- Fehlt der Pfad und ein lokaler Provider soll laufen: Abbruch mit klarer Meldung, **bevor** ein
  Prozess entsteht — die CLI darf nie im Serververzeichnis landen.
- **Empfehlung an den Nutzer:** Das Arbeitsverzeichnis sollte unter Git-Versionskontrolle stehen.
  Mit `acceptEdits` kann ein Ticket-Text ungeprüft Dateien ändern; Git ist die Rückrolloption.

## Ablauf eines CLI-Laufs

1. `POST /api/tickets/:id/run`
2. Runner löst Adapter über `agent.provider` auf
3. Bei `kind === 'local'`: Arbeitsverzeichnis prüfen, Verfügbarkeit erneut prüfen
4. Subprozess im Arbeitsverzeichnis starten (Flags siehe „Umfeld")
5. NDJSON-Zeilen von stdout parsen → auf bestehende `ActivityStep`-Typen abbilden:
   Tool-Aufrufe → `skill`, Text → `message`, Fehler → `error`
6. Schritte yielden; Runner persistiert und broadcastet wie gehabt

`buildSystem()` und `buildTask()` werden **geteilt** — Projekt-Instruktionen und `design.md` gelten
für alle Provider. Bei der CLI gehen sie über `--append-system-prompt` bzw. als Nachricht rein.

Die UI ändert sich dadurch nicht: Der Ticket-Thread rendert dieselben Schritt-Typen wie heute.

### Skills gelten für CLI-Agenten nicht

Claude Code und opencode bringen eigene Werkzeuge mit und wissen nichts von Orchestras Skill-Liste
(`brainstorm`, `grillme`). Ein Häkchen dort hätte bei einem CLI-Agenten **keine Wirkung**. Die
Skill-Auswahl im Agenten-Dialog wird daher bei lokalen Providern ausgegraut, mit Hinweis. Sonst
entsteht genau die stille Fassade, die am 2026-07-15 aus dem Projekt entfernt wurde.

## Fehlerbehandlung

- **Vor dem Start abbrechen:** fehlendes/ungültiges Arbeitsverzeichnis, zwischenzeitlich
  deinstallierte CLI (Cache kann veraltet sein). Meldungsstil wie die bestehende
  `ANTHROPIC_API_KEY`-Meldung: Ursache + was zu tun ist.
- **Prozessbäume beenden:** `claude` und `opencode` starten Kindprozesse. Ein `kill` auf den
  direkten Subprozess lässt Enkel laufen; auf Windows braucht es `taskkill /T /F` auf den Baum.
  Cleanup greift an drei Stellen: Ticket-Abbruch, Timeout, Server-Shutdown.
  *(Belegt: in der Sitzung vom 2026-07-15 hingen verwaiste `tsx watch`-Prozesse an der SQLite-Datei,
  weil nur der npm-Wrapper beendet wurde, nicht dessen Kind.)*
- **Timeout:** konfigurierbar, Default 10 Minuten. Danach Prozessbaum beenden und `error`-Schritt
  ins Thread — kein stilles Hängen.
- **Kaputte NDJSON-Zeile:** überspringen, in den Serverlog, Lauf läuft weiter. Ein Formatwechsel
  einer künftigen CLI-Version soll degradieren, nicht sprengen.
- **Exit-Code ≠ 0:** letzte stderr-Zeilen in den `error`-Schritt statt eines generischen
  „Lauf abgebrochen".

## Tests

**Vitest** für Frontend und Server (neu einzuführen; das Projekt hat aktuell weder Framework noch
Testdateien, die CI macht nur Typecheck und Build).

| Was | Wie |
|---|---|
| Event-Mapping | **Reine Funktion:** NDJSON-Zeilen → `ActivityStep[]`. Fixtures aus **echter, einmalig aufgezeichneter** Ausgabe beider CLIs — keine geratenen Mocks. Der fehleranfälligste Teil (fremdes Format), zugleich der am leichtesten testbare. |
| Erkennung | Mit präpariertem PATH; verfügbar / nicht verfügbar / kaputte Versionsausgabe |
| Runner-Orchestrierung | Gegen Stub-Adapter mit gescripteten Schritten — ohne echte CLI, ohne Netzwerk |
| Fehlerpfade | Fehlendes Arbeitsverzeichnis, Exit ≠ 0, kaputte Zeile, Timeout |

CI bekommt einen `npm test`-Schritt für beide Pakete.

## Bewusst außerhalb des Umfangs

- **OpenAI- und Gemini-Anbindung.** Vom Nutzer gewünscht, aber eigenes Projekt: zwei weitere
  SDK-Clients, je eigene Key-Verwaltung, Tool-Schema-Übersetzung, unterschiedliche
  Streaming-Formate. Steckt sich nach dieser Spec in die fertige Abstraktion und wird dadurch
  deutlich kleiner. Bis dahin tauchen `gpt-4o` und `gemini-2.5-pro` schlicht nicht mehr auf: Die
  Liste kommt aus der Registry, und die kennt nur Adapter, die es gibt. Damit gehen sie auch nicht
  mehr still an Anthropic.
- **Ollama / lokale Modell-Runtimes.** Der Nutzer meinte die CLI-Agenten. Ollama läuft zwar, hat
  aber keine Modelle. Kein Bedarf.
- **Sandboxing / Mehrbenutzerbetrieb.** Explizit ausgeschlossen: Orchestra läuft lokal für einen
  Nutzer. **Wenn sich das ändert, muss diese Entscheidung neu bewertet werden** — CLI-Läufe mit
  Schreibzugriff bedeuten bei offener Registrierung Codeausführung auf dem Host für jeden, der sich
  anlegt. Die `owner_id`-Isolation schützt Datenzeilen, nicht das Dateisystem.
- **`aider`.** Nicht installiert; wird von der Erkennung als nicht verfügbar geführt. Sobald es
  vorhanden ist, ist die Anbindung ein Konfigurationseintrag in `cli.ts`.
