/** Kapitel 13 · Geheimschrift der Eule (Spec K13, KI-AK-15) */
import { SPRITES, drawSprite } from "../art/sprites.ts";
import { drawNumber, ellipse } from "../art/scenes.ts";
import { CAESAR_LEVELS, counts, decode, encode, turnsFor } from "../logic/caesar.ts";
import { starsOf, type Chapter, type Kit } from "./kit.ts";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function caesarChapter(kit: Kit): Chapter {
  const S = { li: 0, key: 0, turns: 0, cipher: "", done: false, spin: 0 };
  const lvl = () => CAESAR_LEVELS[S.li]!;
  function show() {
    const l = lvl();
    const read = decode(S.cipher, S.key);
    let extra: string;
    if (l.shown)
      extra = `<br><small>🦉 Die Eule verrät: Die Scheibe muss auf <b>${l.key}</b>.</small>`;
    else if (l.word) extra = `<br><small>🦉 Ein Wort im Brief heißt <b>${l.word}</b>.</small>`;
    else {
      const top = Object.entries(counts(S.cipher))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([c, n]) => `${c} ${"▮".repeat(n)}`)
        .join(" · ");
      extra = `<br><small>🦉 Häufigste Buchstaben im Brief: ${top}<br>Im Deutschen ist <b>E</b> der häufigste Buchstabe.</small>`;
    }
    kit.info(
      `✉️ Geheimbrief: <code>${esc(S.cipher)}</code><br>🔑 Mit Scheibe ${S.key}: <code>${esc(read)}</code>${extra}`,
    );
  }
  function ui() {
    kit.setTop(
      `🦉 Level ${S.li + 1} · Geheimschrift`,
      [
        { id: "links", label: "◀ Scheibe" },
        { id: "rechts", label: "Scheibe ▶" },
        { id: "gelesen", label: "✨ Gelesen!", primary: true },
        { id: "selbst", label: "✍️ Selbst verschlüsseln" },
        { id: "map", label: "🏝️ Insel" },
      ],
      (id) => {
        if (id === "links" || id === "rechts") turn(id === "rechts" ? 1 : -1);
        else if (id === "gelesen") check();
        else if (id === "selbst") own();
        else kit.map();
      },
    );
    count();
    show();
  }
  const count = () =>
    kit.setCount(`Scheibe: ${S.key} · Drehungen: ${S.turns} · Profi-Zahl: ${turnsFor(lvl().key)}`);
  function turn(d: number) {
    if (S.done) return;
    S.key = (S.key + d + 26) % 26;
    S.turns++;
    S.spin = kit.clock();
    kit.sound.click();
    count();
    show();
  }
  function check() {
    if (S.done) return;
    if (decode(S.cipher, S.key) !== lvl().plain) {
      kit.sound.ouch();
      kit.toast("Das ist noch Kauderwelsch – dreh weiter an der Scheibe!", 3);
      return;
    }
    S.done = true;
    kit.sound.tada();
    kit.finish({
      chapter: "geheim",
      level: lvl().id,
      stars: starsOf(S.turns, turnsFor(lvl().key)),
      text: `Gelesen: „${lvl().plain}“ – der Schlüssel war ${lvl().key}.`,
      next: CAESAR_LEVELS[S.li + 1] ? () => start(S.li + 1) : null,
      again: () => start(S.li),
    });
  }
  function own() {
    const el = kit.panel(
      `<h2>✍️ Selbst verschlüsseln</h2>
       <label class="ki-vol">Nachricht <input type="text" maxlength="60" value="HALLO EULE" aria-label="Nachricht"></label>
       <label class="ki-vol">Schlüssel <input type="number" min="1" max="25" value="3" aria-label="Schlüssel"></label>
       <p>Geheim: <code data-out></code></p>
       <div class="ki-row"><button class="ki-btn ki-primary" type="button" data-x>Fertig</button></div>`,
      "Selbst verschlüsseln",
    );
    const [txt, k] = [...el.querySelectorAll<HTMLInputElement>("input")] as [
      HTMLInputElement,
      HTMLInputElement,
    ];
    const out = el.querySelector<HTMLElement>("[data-out]")!;
    const upd = () => (out.textContent = encode(txt.value, Number(k.value) || 0));
    txt.addEventListener("input", upd);
    k.addEventListener("input", upd);
    upd();
    el.querySelector("[data-x]")!.addEventListener("click", () => kit.closePanel());
  }
  function start(i: number) {
    S.li = i;
    S.key = 0;
    S.turns = 0;
    S.done = false;
    S.cipher = encode(lvl().plain, lvl().key);
    kit.intro(
      `🦉 Geheimschrift der Eule`,
      `<p>Die Eule schickt dir einen Brief in Geheimschrift: Jeder Buchstabe ist im Alphabet um ein
       paar Plätze <b>weitergerückt</b>. Dreh die Scheibe, bis du den Brief lesen kannst, und drück
       „✨ Gelesen!“.</p>`,
    );
    ui();
  }
  return {
    id: "geheim",
    icon: "✉️",
    title: "Geheimschrift",
    region: "codes",
    levels: CAESAR_LEVELS.map((l, i) => ({
      id: l.id,
      label: ["mit Schlüssel", "ein Wort verraten", "knacken"][i]!,
    })),
    card: `<h2>🤖 So denkt ein Computer</h2>
      <p>Das ist der <b>Cäsar-Code</b> – schon die alten Römer haben so geheime Briefe geschrieben.
      Er ist leicht zu knacken: Es gibt nur 25 Möglichkeiten, und der häufigste Buchstabe ist
      meistens ein <b>E</b>.</p>
      <p>Heutige Computer verschlüsseln mit riesigen Zahlen-Schlüsseln, die man nicht durchprobieren
      kann – so sind Nachrichten im Internet sicher.</p>`,
    start,
    tick() {},
    draw(g, vw, vh) {
      const t = kit.clock();
      g.fillStyle = "#2a3560";
      g.fillRect(0, 0, vw, vh);
      g.fillStyle = "#6b4226";
      g.fillRect(0, Math.round(vh * 0.86), vw, vh);
      drawSprite(g, SPRITES.eule!, Math.round(vw * 0.12), Math.round(vh * 0.86 - 30), false, {}, 3);
      // Drehscheibe
      const cx = Math.round(vw * 0.62);
      const cy = Math.round(vh * 0.68);
      const R = Math.min(48, Math.round(vh * 0.2));
      ellipse(g, cx, cy, R, R, "#c9a227");
      ellipse(g, cx, cy, R - 6, R - 6, "#f2dfc0");
      ellipse(g, cx, cy, R - 16, R - 16, "#e8cfa0");
      const wob = Math.max(0, 0.3 - (t - S.spin)) * 0.6;
      for (let i = 0; i < 26; i++) {
        const a = ((i - S.key) / 26) * Math.PI * 2 - Math.PI / 2 + wob;
        g.fillStyle = i === 0 ? "#c0504d" : "#5a3a22";
        g.fillRect(
          Math.round(cx + Math.cos(a) * (R - 11)),
          Math.round(cy + Math.sin(a) * (R - 11)),
          2,
          2,
        );
      }
      g.fillStyle = "#c0504d";
      g.fillRect(cx - 1, cy - R - 4, 3, 6);
      drawNumber(g, S.key, cx, cy, "#2b2233");
    },
    down() {},
    key(e) {
      if (e.key === "ArrowLeft") turn(-1);
      else if (e.key === "ArrowRight") turn(1);
      else if (e.key === "Enter") check();
      else return false;
      return true;
    },
    debug: () => ({
      level: lvl().id,
      key: S.key,
      turns: S.turns,
      solutionKey: lvl().key,
      read: decode(S.cipher, S.key),
      done: S.done,
    }),
  };
}
