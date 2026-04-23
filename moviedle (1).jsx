import { useState, useRef, useEffect } from "react";

async function callClaude(prompt, maxTokens = 1500) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.content.find((b) => b.type === "text")?.text || "";
}

const MOVIE_POOL = [
  // Classics & New Hollywood
  "The Godfather","The Godfather Part II","Goodfellas","Chinatown","Taxi Driver",
  "Raging Bull","Apocalypse Now","One Flew Over the Cuckoo's Nest","Network",
  "All the President's Men","Dog Day Afternoon","Serpico","The French Connection",
  "Midnight Cowboy","Easy Rider","Bonnie and Clyde","The Graduate",
  "2001: A Space Odyssey","A Clockwork Orange","The Shining","Full Metal Jacket",
  "Barry Lyndon","Eyes Wide Shut","Dr. Strangelove",
  // 80s
  "Blade Runner","E.T. the Extra-Terrestrial","Jaws","Raiders of the Lost Ark",
  "Back to the Future","The Terminator","Terminator 2","Die Hard","Scarface",
  "Platoon","Born on the Fourth of July","Blue Velvet","Mulholland Drive",
  "Stand by Me","The Breakfast Club","Ferris Bueller's Day Off","Beetlejuice",
  "Ghostbusters","RoboCop","Aliens","The Empire Strikes Back","Return of the Jedi",
  "Predator","Coming to America","Rain Man","Wall Street","Working Girl",
  // 90s
  "Pulp Fiction","Reservoir Dogs","Fargo","The Big Lebowski","Jackie Brown",
  "The Silence of the Lambs","Se7en","Fight Club","The Usual Suspects",
  "Schindler's List","Forrest Gump","The Shawshank Redemption","American Beauty",
  "Boogie Nights","Magnolia","Short Cuts","L.A. Confidential","Heat",
  "Natural Born Killers","JFK","Unforgiven","Dances with Wolves",
  "The Truman Show","Being John Malkovich","American History X","Donnie Darko",
  "Titanic","Jurassic Park","Speed","Point Break","A Few Good Men",
  "Goodfellas","Casino","JFK","Primal Fear","Absence of Malice",
  "Toy Story","The Lion King","Aladdin","Beauty and the Beast",
  // 2000s
  "No Country for Old Men","There Will Be Blood","Zodiac","Prisoners","Gone Girl",
  "Nightcrawler","Memento","Adaptation","Eternal Sunshine of the Spotless Mind",
  "Almost Famous","Vanilla Sky","Requiem for a Dream","Brokeback Mountain",
  "Mystic River","21 Grams","Million Dollar Baby","Crash","Road to Perdition",
  "A History of Violence","The Wrestler","Black Swan","The Hours",
  "Cast Away","The Green Mile","A.I. Artificial Intelligence","Minority Report",
  "Catch Me If You Can","Gangs of New York","The Departed","The Aviator",
  "The Dark Knight","Batman Begins","Spider-Man","Iron Man","The Avengers",
  "Inception","The Matrix","WALL-E","Up","Finding Nemo","Ratatouille",
  "The Incredibles","Monsters Inc","Toy Story 3","Argo","Spotlight",
  "The Royal Tenenbaums","Rushmore","Lost in Translation","Her",
  // 2010s
  "Whiplash","La La Land","Moonlight","Get Out","Us","Hereditary",
  "Midsommar","The Witch","A Quiet Place","Mad Max: Fury Road",
  "Arrival","Ex Machina","Interstellar","Gravity","The Revenant",
  "Birdman","12 Years a Slave","Dallas Buyers Club","Nebraska",
  "Inside Llewyn Davis","Manchester by the Sea","Moonrise Kingdom",
  "The Grand Budapest Hotel","Isle of Dogs","Fantastic Mr Fox",
  "Knives Out","Once Upon a Time in Hollywood","Inglourious Basterds",
  "Django Unchained","The Hurt Locker","Zero Dark Thirty","Vice",
  "The Big Short","Wolf of Wall Street","American Hustle","Silver Linings Playbook",
  "Drive","Uncut Gems","Good Time","Eighth Grade","Mid90s","Waves",
  "First Reformed","A Ghost Story","Paterson","The Florida Project",
  "Beasts of the Southern Wild","Winter's Bone","Promising Young Woman",
  "The Lighthouse","Carol","Room","Spotlight","BlackKklansman",
  // 2020s
  "Glass Onion","Everything Everywhere All at Once","The Banshees of Inisherin",
  "Tár","The Fabelmans","Babylon","Nope","X","Pearl","Barbarian",
  "Top Gun: Maverick","Elvis","Women Talking","Oppenheimer","Killers of the Flower Moon",
  "Past Lives","May December","American Fiction","Poor Things","Priscilla"
];

const playedTitles = new Set();

async function pickSecretMovie() {
  const available = MOVIE_POOL.filter(t => !playedTitles.has(t));
  const pool = available.length > 0 ? available : MOVIE_POOL;
  const title = pool[Math.floor(Math.random() * pool.length)];
  playedTitles.add(title);
  const raw = await callClaude(`You are providing data for a movie guessing game. The movie is: "${title}".
Return ONLY raw JSON with these exact keys — no markdown, no backticks, no extra text:
- title: string (exact canonical title)
- year: number (original release year)
- director: string (primary director, full name)
- studio: string (main production or distribution studio)
- cast: array of 4-5 lead actor full name strings
- genre: string (single word, e.g. Thriller, Drama, Comedy, Action, Horror, Sci-Fi, Animation)
- hint: string (one short, deliberately vague sentence that evokes the mood or theme of the film without describing the plot directly — no character names, no title, no director, no specific events or locations that would make it obvious)

Start with { end with }`);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON");
  return JSON.parse(match[0]);
}

async function evaluateGuess(secret, guess) {
  const raw = await callClaude(`You are judging a movie guessing game.

SECRET MOVIE (never reveal):
${JSON.stringify(secret)}

PLAYER GUESS: "${guess}"

Identify the movie the player means. Compare it to the secret. 
Respond ONLY with raw JSON, no markdown, no backticks.

Required keys:
- guessedTitle: string (canonical title)
- guessedYear: number or null
- guessedDirector: string or null
- guessedStudio: string or null
- guessedCast: array of strings (3-5 lead actors) or []
- correct: boolean
- sameDirector: boolean
- sharedActors: string[] (names in both casts)
- sameStudio: boolean
- yearHint: "earlier" | "later" | "same" | null  (earlier = guessed came out BEFORE secret, later = guessed came out AFTER secret)
- yearDiff: number or null (absolute number of years between the two, 0 if same)
- genreMatch: boolean
- temperature: "freezing" | "cold" | "warm" | "hot" | "burning"
  (score based on total matches: burning=correct, hot=3+ matches, warm=2 matches, cold=1 match, freezing=0 matches)
- unknown: boolean (true if you don't recognise the guessed film)

Start with { end with }`);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON");
  return JSON.parse(match[0]);
}

const TEMP_CONFIG = {
  freezing: { emoji: "🧊", label: "Stone Cold", color: "#5a8aaa", bg: "rgba(80,120,160,0.15)", border: "rgba(80,120,160,0.3)" },
  cold:     { emoji: "🎭", label: "Cold",       color: "#6a7aaa", bg: "rgba(80,100,160,0.12)", border: "rgba(80,100,160,0.25)"  },
  warm:     { emoji: "🍿", label: "Warm",       color: "#b07820", bg: "rgba(180,140,40,0.15)", border: "rgba(180,140,40,0.3)" },
  hot:      { emoji: "🎬", label: "Getting Hot",color: "#c05020", bg: "rgba(200,80,30,0.12)",  border: "rgba(200,80,30,0.3)"  },
  burning:  { emoji: "🏆", label: "On Fire!",   color: "#408020", bg: "rgba(60,130,30,0.15)",  border: "rgba(60,130,30,0.3)"  },
};

function Cell({ label, value, hit, miss, neutral, wide }) {
  const cls = hit ? "cell cell-hit" : miss ? "cell cell-miss" : "cell cell-neutral";
  return (
    <div className={cls + (wide ? " cell-wide" : "")}>
      <div className="cell-label">{label}</div>
      <div className="cell-value">{value}</div>
    </div>
  );
}

function GuessRow({ result, index }) {
  const temp = TEMP_CONFIG[result.temperature] || TEMP_CONFIG.cold;

  if (result.unknown) {
    return (
      <div className="guess-card" style={{animationDelay:`${index*0.04}s`}}>
        <div className="guess-card-header" style={{background:"#4a3020"}}>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"rgba(255,255,255,.6)"}}>#{index+1} — Unrecognised</span>
        </div>
        <div style={{padding:"10px 16px",fontFamily:"'Barlow',sans-serif",fontSize:13,color:"#6a3020",background:"#faf3e0"}}>
          ❓ Not recognised as a movie — try another title.
        </div>
      </div>
    );
  }

  if (result.correct) {
    return (
      <div className="guess-card" style={{animationDelay:`${index*0.04}s`}}>
        <div className="guess-card-header" style={{background:"#1a5c1a"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"rgba(255,255,255,.6)",marginBottom:2}}>#{index+1} — Correct!</div>
              <div className="guess-card-title" style={{fontSize:20}}>{result.guessedTitle} 🏆</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const yearVal = result.guessedYear
    ? `${result.guessedYear}${result.yearHint === "earlier" ? " — secret is later ↑" : result.yearHint === "later" ? " — secret is earlier ↓" : result.yearHint === "same" ? " — same year ✓" : ""}`
    : "Unknown";
  const yearHit = result.yearHint === "same";
  const yearMiss = result.yearHint === "earlier" || result.yearHint === "later";

  const castVal = result.guessedCast?.length
    ? result.guessedCast.map(a => {
        const shared = result.sharedActors?.includes(a);
        return shared ? `★ ${a}` : a;
      }).join(", ")
    : "Unknown";

  return (
    <div className="guess-card" style={{animationDelay:`${index*0.04}s`}}>
      <div className="guess-card-header">
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"rgba(255,255,255,.5)",marginBottom:1}}>#{index+1}</div>
            <div className="guess-card-title" style={{fontSize:16,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{result.guessedTitle}</div>
          </div>
        </div>
        <div className="temp-badge" style={{background:temp.bg,borderColor:temp.border,color:temp.color,flexShrink:0,marginLeft:8}}>
          <span>{temp.emoji}</span><span>{temp.label}</span>
        </div>
      </div>
      <div className="guess-card-body">
        <div className="guess-cells">
          <Cell label="Year" value={yearVal} hit={yearHit} miss={yearMiss} />
          <Cell label="Director" value={result.guessedDirector || "Unknown"}
            hit={result.sameDirector} miss={!result.sameDirector && !!result.guessedDirector} />
          <Cell label="Studio" value={result.guessedStudio || "Unknown"}
            hit={result.sameStudio} miss={!result.sameStudio && !!result.guessedStudio} />
          <Cell label="Genre" value={result.genreMatch ? "Same genre ✓" : "Different genre"}
            hit={result.genreMatch} miss={!result.genreMatch} />
          <Cell label={result.sharedActors?.length ? `Cast (${result.sharedActors.length} shared ★)` : "Cast"}
            value={castVal} hit={result.sharedActors?.length > 0} neutral={!result.sharedActors?.length} wide />
        </div>
      </div>
    </div>
  );
}

const rowStyle = (i) => ({
  background: "#1c1408",
  border: "1px solid #3a2e14",
  borderRadius: 2,
  padding: "16px",
  animation: "slideIn 0.3s ease both",
  animationDelay: `${i * 0.04}s`,
  position: "relative",
});
const titleRowStyle = { display: "flex", alignItems: "center", gap: 10, marginBottom: 2 };
const numStyle = { fontSize: 10, color: "#5a4820", fontWeight: 600, letterSpacing: 2, flexShrink: 0, fontFamily: "'Josefin Sans', sans-serif", textTransform: "uppercase" };
const nameStyle = { fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#e8dcc0" };

export default function Moviedle() {
  const [phase, setPhase] = useState("home");
  const [secret, setSecret] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [revealedHints, setRevealedHints] = useState({ director: false, cast: false, plot: false });
  const [movieQuote, setMovieQuote] = useState(null);
  const inputRef = useRef(null);
  const MAX = 8;

  const startGame = async () => {
    setPhase("loading");
    setError(null);
    setGuesses([]);
    setRevealedHints({ director: false, cast: false, plot: false });
    setMovieQuote(null);
    setInput("");
    try {
      const movie = await pickSecretMovie();
      setSecret(movie);
      setPhase("playing");
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) {
      setError("Couldn't connect. Try again.");
      setPhase("home");
    }
  };

  const submitGuess = async () => {
    const raw = input.trim();
    if (!raw || evaluating) return;
    setInput("");
    setEvaluating(true);
    setError(null);
    try {
      const result = await evaluateGuess(secret, raw);
      result.rawGuess = raw;
      if (result.unknown) {
        // Don't count against the player — just show a message
        setError(`❓ "${raw}" wasn't recognised as a movie. Try another title — this won't count as a guess.`);
        setEvaluating(false);
        return;
      }
      const next = [...guesses, result];
      setGuesses(next);
      if (result.correct) {
        setPhase("won");
        callClaude(`Give me one single iconic, memorable quote from the movie "${result.guessedTitle}". Return ONLY the quote text inside quotation marks — nothing else, no speaker name, no context, no explanation. Example format: "Here's looking at you, kid."`, 300)
          .then(q => {
            const match = q.match(/"([^"]+)"/);
            setMovieQuote(match ? `"${match[1]}"` : q.trim());
          })
          .catch(() => setMovieQuote(null));
      }
      else if (next.length >= MAX) setPhase("lost");
    } catch (e) {
      setError("Error evaluating guess — try again.");
    }
    setEvaluating(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const attemptsLeft = MAX - guesses.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #2d1010; }
        @keyframes slideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes marquee-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes bulb-pulse { 0%,100%{opacity:1} 50%{opacity:.6} }

        .app {
          min-height: 100vh;
          background: #2d1010;
          background-image: radial-gradient(ellipse at 50% 0%, rgba(220,60,30,0.08) 0%, transparent 55%);
          color: #f0e8d8; font-family: 'Barlow', sans-serif;
          display: flex; flex-direction: column; align-items: center;
          padding: 0 0 80px;
        }

        /* ── MARQUEE HEADER ── */
        .theater-marquee {
          width: 100%; background: #3a1212;
          border-bottom: 4px solid #b02020;
          padding: 0 0 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .marquee-bulbs {
          display: flex; justify-content: center; gap: 14px;
          padding: 12px 0 8px;
        }
        .bulb {
          width: 10px; height: 10px; border-radius: 50%;
          background: #f5c842;
          box-shadow: 0 0 6px 2px rgba(245,200,66,.5);
          animation: bulb-pulse 1.6s ease-in-out infinite;
        }
        .bulb:nth-child(even) { animation-delay: .8s; background: #f5a842; box-shadow: 0 0 6px 2px rgba(245,168,66,.5); }
        .marquee-title {
          font-family: 'Alfa Slab One', serif;
          font-size: clamp(36px, 8vw, 60px);
          color: #f5c842;
          letter-spacing: 6px;
          text-shadow: 0 0 30px rgba(245,200,66,.5), 3px 3px 0 #5a1a00, 4px 4px 0 rgba(0,0,0,.3);
          line-height: 1; padding: 8px 0 4px;
        }
        .marquee-sub {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 600; letter-spacing: 6px;
          text-transform: uppercase; color: #c84040; margin-top: 4px;
        }
        .ticker-wrap {
          overflow: hidden; white-space: nowrap;
          border-top: 1px solid #5a2020; border-bottom: 1px solid #5a2020;
          background: #2a0e0e; padding: 6px 0; margin-top: 12px;
        }
        .ticker-inner {
          display: inline-block;
          animation: marquee-scroll 22s linear infinite;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 600; letter-spacing: 3px;
          text-transform: uppercase; color: #8b3020;
        }
        .ticker-inner span { margin: 0 32px; }

        /* ── CONTENT AREA ── */
        .content { width: 100%; max-width: 660px; padding: 28px 16px 0; }

        /* ── TICKET STUB CARD ── */
        .ticket {
          width: 100%; background: #faf3e0;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,.6), 0 2px 8px rgba(0,0,0,.4);
          margin-bottom: 0;
          position: relative;
        }
        .ticket-top {
          background: #c0392b;
          padding: 16px 20px 14px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .ticket-cinema {
          font-family: 'Alfa Slab One', serif; font-size: 18px;
          color: #f5c842; letter-spacing: 2px; text-shadow: 1px 1px 0 rgba(0,0,0,.3);
        }
        .ticket-admit {
          font-family: 'Barlow Condensed', sans-serif; font-size: 11px;
          font-weight: 700; letter-spacing: 3px; text-transform: uppercase;
          color: rgba(255,255,255,.6);
        }
        .ticket-body { padding: 20px 22px; background: #faf3e0; }
        .ticket-tear {
          height: 0; border-top: 2px dashed #d4b896;
          margin: 0 -22px; position: relative;
        }
        .ticket-tear::before, .ticket-tear::after {
          content: ''; position: absolute; top: -8px;
          width: 14px; height: 14px; background: #2d1010;
          border-radius: 50%;
        }
        .ticket-tear::before { left: -7px; }
        .ticket-tear::after { right: -7px; }
        .ticket-stub { padding: 12px 22px 16px; background: #f0e4c8; }
        .ticket-stub-row { display: flex; justify-content: space-between; align-items: center; }
        .ticket-field { font-family:'Barlow Condensed',sans-serif; }
        .ticket-field-label { font-size:9px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#8a6a50; }
        .ticket-field-value { font-size:14px; font-weight:700; color:#2a1a0a; margin-top:1px; letter-spacing:.5px; }

        /* ── GAME CARD (red) ── */
        .game-card {
          width: 100%; background: #341414;
          border: 1px solid #5a2020;
          border-radius: 6px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,.5);
        }

        /* ── GUESS ROW (looks like a printed receipt / stub) ── */
        .guess-card {
          width: 100%; background: #faf3e0;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,.5);
          animation: slideIn 0.3s ease both;
        }
        .guess-card-header {
          background: #8b1a1a; padding: 8px 16px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .guess-card-title {
          font-family: 'Barlow Condensed', sans-serif; font-size: 17px;
          font-weight: 800; color: #fff; letter-spacing: 1px;
        }
        .guess-card-body { padding: 12px 16px; }
        .guess-cells { display: flex; flex-wrap: wrap; gap: 8px; }

        /* ── CELL ── */
        .cell {
          flex: 1 1 100px; min-width: 0; padding: 8px 12px;
          border-radius: 3px; border: 1px solid;
        }
        .cell-label { font-family:'Barlow Condensed',sans-serif; font-size:9px; font-weight:700; letter-spacing:2px; text-transform:uppercase; margin-bottom:3px; }
        .cell-value { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; line-height:1.3; word-break:break-word; letter-spacing:.3px; }
        .cell-hit   { background:#e8f5e0; border-color:#6aaa40; }
        .cell-hit .cell-label   { color:#4a8a20; }
        .cell-hit .cell-value   { color:#2a6010; }
        .cell-miss  { background:#fde8e0; border-color:#d06040; }
        .cell-miss .cell-label  { color:#b04030; }
        .cell-miss .cell-value  { color:#803020; }
        .cell-neutral { background:#f0e8d4; border-color:#c8b890; }
        .cell-neutral .cell-label { color:#8a7050; }
        .cell-neutral .cell-value { color:#4a3820; }
        .cell-wide { flex: 2 1 180px; }

        /* ── TEMP BADGE ── */
        .temp-badge {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 12px; border-radius: 3px; border: 1px solid;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
        }

        /* ── INPUTS ── */
        .guess-input {
          flex: 1; padding: 13px 16px;
          background: #2a0e0e; border: 1px solid #5a2020; border-radius: 4px;
          color: #f0e8d8; font-family: 'Barlow Condensed', sans-serif;
          font-size: 16px; font-weight: 600; letter-spacing: 1px;
          outline: none; transition: border-color .15s;
        }
        .guess-input:focus { border-color: #e04040; box-shadow: 0 0 0 2px rgba(192,57,43,.2); }
        .guess-input::placeholder { color: #5a2020; }

        .submit-btn {
          padding: 13px 20px; background: #c0392b; color: #fff;
          border: none; border-radius: 4px;
          font-family: 'Barlow Condensed', sans-serif; font-size: 14px;
          font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          cursor: pointer; transition: all .15s;
          white-space: nowrap; display: flex; align-items: center; gap: 8px;
        }
        .submit-btn:hover:not(:disabled) { background: #e04030; }
        .submit-btn:disabled { opacity: .35; cursor: not-allowed; }

        .play-btn {
          width: 100%; padding: 16px; background: #c0392b; color: #fff;
          border: none; border-radius: 4px;
          font-family: 'Barlow Condensed', sans-serif; font-size: 16px;
          font-weight: 800; letter-spacing: 4px; text-transform: uppercase;
          cursor: pointer; transition: all .2s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 4px 20px rgba(192,57,43,.35);
        }
        .play-btn:hover:not(:disabled) { background: #e04030; transform: translateY(-1px); box-shadow: 0 6px 28px rgba(192,57,43,.5); }
        .play-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }

        .again-btn {
          width: 100%; padding: 16px; background: #c0392b; color: #fff;
          border: none; border-radius: 4px;
          font-family: 'Barlow Condensed', sans-serif; font-size: 16px;
          font-weight: 800; letter-spacing: 4px; text-transform: uppercase;
          cursor: pointer; transition: all .2s;
          box-shadow: 0 4px 20px rgba(192,57,43,.35);
        }
        .again-btn:hover { background: #e04030; transform: translateY(-1px); }

        .hint-btn {
          padding: 6px 14px; background: transparent;
          border: 1px solid #5a2020; border-radius: 3px;
          color: #a05040; font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          cursor: pointer; transition: all .15s;
        }
        .hint-btn:hover { border-color: #c0392b; color: #c0392b; }

        .hint-box {
          background: #f0e8d4; border-left: 3px solid #c0392b;
          padding: 10px 14px; font-family: 'Barlow', sans-serif;
          font-size: 13px; color: #5a3020; font-style: italic;
          margin-bottom: 0; line-height: 1.6; border-radius: 0 3px 3px 0;
        }
        .hint-box-label { font-family:'Barlow Condensed',sans-serif; font-size:9px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#c0392b; margin-bottom:4px; font-style:normal; }

        .attempts-pill {
          background: transparent; border: 1px solid #5a2020; border-radius: 3px;
          padding: 5px 12px; font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: #f5c842;
        }
        .attempts-pill.low { border-color: #7a2010; color: #e05030; }

        .spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,.2); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
        .big-spin { width:44px; height:44px; border:3px solid rgba(192,57,43,.2); border-top-color:#c0392b; border-radius:50%; animation:spin .9s linear infinite; margin:0 auto 20px; }

        .err { font-size:12px; color:#e05030; text-align:center; margin-top:10px; letter-spacing:1px; font-family:'Barlow Condensed',sans-serif; }
        .rule { display:flex; gap:12px; align-items:flex-start; font-size:13px; color:#8a6a50; line-height:1.6; }
        .popcorn-row { display:flex; justify-content:center; gap:6px; font-size:20px; margin:12px 0; opacity:.4; }
      `}</style>

      <div className="app">
        {/* ── MARQUEE ── */}
        <div className="theater-marquee">
          <div className="marquee-bulbs">
            {Array(20).fill(0).map((_,i) => <div key={i} className="bulb" style={{animationDelay:`${(i*0.15)%1.6}s`}}/>)}
          </div>
          <div className="marquee-title">MOVIEDLE</div>
          <div className="marquee-sub">Now Playing · Guess the Feature</div>
          <div className="ticker-wrap">
            <div className="ticker-inner">
              <span>🎬 NOW PLAYING</span><span>★ COMING SOON ★</span><span>🍿 CONCESSIONS AVAILABLE</span><span>★ RESERVED SEATING ★</span><span>🎟 ADMIT ONE</span><span>★ FEATURE PRESENTATION ★</span>
              <span>🎬 NOW PLAYING</span><span>★ COMING SOON ★</span><span>🍿 CONCESSIONS AVAILABLE</span><span>★ RESERVED SEATING ★</span><span>🎟 ADMIT ONE</span><span>★ FEATURE PRESENTATION ★</span>
            </div>
          </div>
          <div className="marquee-bulbs" style={{paddingTop:8,paddingBottom:0}}>
            {Array(20).fill(0).map((_,i) => <div key={i} className="bulb" style={{animationDelay:`${(i*0.15+0.8)%1.6}s`}}/>)}
          </div>
        </div>

        <div className="content">

        {phase === "home" && (
          <div>
            <div className="ticket" style={{marginBottom:16}}>
              <div className="ticket-top">
                <div className="ticket-cinema">🎟 ADMIT ONE</div>
                <div className="ticket-admit">Mystery Feature</div>
              </div>
              <div className="ticket-body">
                <p style={{ fontSize: 14, color: "#4a3020", lineHeight: 1.8, marginBottom: 20, fontFamily:"'Barlow',sans-serif" }}>
                  I'll pick a secret movie. Guess it in <strong style={{ color: "#c0392b" }}>8 tries</strong> — after each wrong guess I'll reveal clues to help narrow it down.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {[
                    ["📅", "Whether the secret came out earlier or later than your guess"],
                    ["🎥", "The director of your guessed movie, and if it matches"],
                    ["🌟", "The cast, highlighting any shared actors"],
                    ["🏢", "The studio, and whether it matches"],
                    ["🌡️", "A temperature — Stone Cold to On Fire — based on total matches"],
                  ].map(([icon, text]) => (
                    <div key={icon} className="rule"><span style={{ fontSize: 16 }}>{icon}</span><span>{text}</span></div>
                  ))}
                </div>
              </div>
              <div className="ticket-tear"/>
              <div className="ticket-stub">
                <div className="ticket-stub-row">
                  <div className="ticket-field"><div className="ticket-field-label">Admission</div><div className="ticket-field-value">General</div></div>
                  <div className="ticket-field" style={{textAlign:"center"}}><div className="ticket-field-label">Guesses</div><div className="ticket-field-value">8</div></div>
                  <div className="ticket-field" style={{textAlign:"right"}}><div className="ticket-field-label">Tonight</div><div className="ticket-field-value">Mystery</div></div>
                </div>
              </div>
            </div>
            <button className="play-btn" onClick={startGame}>🎬 Select Tonight's Feature</button>
            {error && <p className="err">{error}</p>}
          </div>
        )}

        {phase === "loading" && (
          <div className="game-card" style={{ textAlign: "center", padding: "48px 28px" }}>
            <div style={{fontSize:36,marginBottom:16}}>🎬</div>
            <div className="big-spin" />
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: "#8a3020", letterSpacing: 3, textTransform: "uppercase", marginTop:12 }}>Preparing Your Feature…</div>
          </div>
        )}

        {phase === "playing" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* input card */}
            <div className="game-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
                <span className={`attempts-pill ${attemptsLeft <= 3 ? "low" : ""}`}>
                  {attemptsLeft} guess{attemptsLeft !== 1 ? "es" : ""} left
                </span>
                <button className="hint-btn" onClick={startGame} style={{ whiteSpace: "nowrap" }}>↺ New Film</button>
              </div>
              {/* Hint buttons */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {[
                  { key: "director", icon: "🎥", label: "Director", value: secret?.director },
                  { key: "cast",     icon: "🌟", label: "Cast member", value: secret?.cast?.[0] },
                  { key: "plot",     icon: "📖", label: "Plot hint", value: secret?.hint },
                ].map(({ key, icon, label, value }) => (
                  revealedHints[key]
                    ? <div key={key} className="hint-box" style={{ flex: "1 1 160px", marginBottom: 0 }}>
                        <div className="hint-box-label">{icon} {label}</div>
                        {value}
                      </div>
                    : <button key={key} className="hint-btn" style={{ flex: "1 1 100px" }}
                        onClick={() => setRevealedHints(h => ({ ...h, [key]: true }))}>
                        {icon} {label}
                      </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  ref={inputRef}
                  className="guess-input"
                  placeholder="Type a movie title…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitGuess()}
                  disabled={evaluating}
                />
                <button className="submit-btn" onClick={submitGuess} disabled={evaluating || !input.trim()}>
                  {evaluating ? <><div className="spinner" />Checking</> : "Guess →"}
                </button>
              </div>
              {error && <p className="err">{error}</p>}

              {/* legend */}
              {guesses.length > 0 && (
                <div className="legend" style={{ marginTop: 16 }}>
                  {[["#6aaa40","Match ✓"],["#d06040","No match"],["#c8b890","Info"]].map(([color, label]) => (
                    <div key={label} className="legend-item">
                      <div className="legend-dot" style={{ background: color, opacity: 0.7 }} />
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* guess history */}
            {[...guesses].reverse().map((g, i) => (
              <GuessRow key={guesses.length-1-i} result={g} index={guesses.length - 1 - i} />
            ))}
          </div>
        )}

        {(phase === "won" || phase === "lost") && (
          <div>
            <div className="ticket" style={{marginBottom:16}}>
              <div className="ticket-top" style={{background: phase==="won" ? "#1a5c1a" : "#5c1a1a"}}>
                <div className="ticket-cinema">{phase==="won" ? "🏆 WINNER!" : "🎬 GAME OVER"}</div>
                <div className="ticket-admit">{phase==="won" ? `${guesses.length} Guess${guesses.length!==1?"es":""}` : "Better luck next time"}</div>
              </div>
              <div className="ticket-body">
                {phase==="won" && (
                  <div style={{marginBottom:16,borderLeft:"3px solid #c0392b",paddingLeft:12,minHeight:40}}>
                    {movieQuote
                      ? <p style={{fontFamily:"'Barlow',sans-serif",fontStyle:"italic",fontSize:15,color:"#4a3020",lineHeight:1.7}}>{movieQuote}</p>
                      : <p style={{fontFamily:"'Barlow',sans-serif",fontSize:13,color:"#b07060",letterSpacing:1}}>Loading quote…</p>
                    }
                  </div>
                )}
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#8a5030",marginBottom:8}}>The Feature Was</div>
                <div style={{fontFamily:"'Alfa Slab One',serif",fontSize:24,color:"#1a0808",lineHeight:1.2,marginBottom:12}}>{secret.title}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["Year",secret.year],["Director",secret.director],["Studio",secret.studio],["Genre",secret.genre]].map(([l,v])=>(
                    <div key={l} className="ticket-field"><div className="ticket-field-label">{l}</div><div className="ticket-field-value" style={{fontSize:13}}>{v}</div></div>
                  ))}
                </div>
                <div className="ticket-field" style={{marginTop:8}}><div className="ticket-field-label">Cast</div><div className="ticket-field-value" style={{fontSize:12,fontWeight:500}}>{secret.cast?.join(", ")}</div></div>
              </div>
              <div className="ticket-tear"/>
              <div className="ticket-stub">
                <div className="ticket-stub-row">
                  <div className="ticket-field"><div className="ticket-field-label">Score</div><div className="ticket-field-value">{guesses.length}/{MAX}</div></div>
                  <div className="ticket-field" style={{textAlign:"right"}}><div className="ticket-field-label">Result</div><div className="ticket-field-value" style={{color: phase==="won"?"#2a6010":"#802010"}}>{phase==="won"?"Solved!":"No Joy"}</div></div>
                </div>
              </div>
            </div>
            <button className="again-btn" onClick={startGame}>🎬 Another Feature</button>
          </div>
        )}
      </div>{/* end content */}
    </div>{/* end app */}
    </>
  );
}
