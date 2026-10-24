import Link from "next/link";

const memories = [
  { photo: "lake", caption: "first lake summer, 2016" },
  { photo: "birthday", caption: "the Maya lean 🎂" },
  { photo: "road", caption: "7 hrs, 1 playlist" },
  { photo: "dinner", caption: "pasta for nine" },
];

function Polaroid({ photo, caption, className = "" }: { photo: string; caption: string; className?: string }) {
  return <div className={`polaroid ${className}`}><div className={`polaroid-photo photo-${photo}`} role="img" aria-label={caption} /><p>{caption}</p></div>;
}

export default function HomeView() {
  return <>
    <section className="home-hero paper">
      <div className="home-hero-inner">
        <div className="home-copy">
          <p className="eyebrow">for the ones who were there</p>
          <h1>The scrapbook<br />your <em>friendship</em><br />deserves.</h1>
          <p className="home-intro">A private place for your group&apos;s photos, the stories behind them, the jokes nobody else gets — and letters to open years from now.</p>
          <div className="hero-actions"><Link className="pill pill-primary" href="/dashboard">Open my vaults</Link><span className="privacy-note">♙&nbsp; Invite-only. Never public.</span></div>
        </div>
        <div className="hero-collage" aria-label="Friendship memories"><Polaroid photo="lake" caption="first lake summer" className="hero-photo hero-photo-one" /><Polaroid photo="birthday" caption="the Maya lean 🎂" className="hero-photo hero-photo-two" /><Polaroid photo="road" caption="7 hrs, 1 playlist" className="hero-photo hero-photo-three" /></div>
      </div>
    </section>
    <section className="memory-band" id="memories"><div className="section-wrap"><h2>Every summer, every story.</h2><p>Memories line up on a timeline you can scroll back through — with the place,<br className="desktop-break" /> the date, and who was there.</p><div className="memory-row">{memories.map((memory) => <Polaroid key={memory.photo} {...memory} />)}</div></div></section>
    <section className="story-section paper"><div className="section-wrap"><div className="feature-row"><div><h3>Memories</h3><p>Photos with the whole story — where, when, and the bit everyone still laughs about.</p></div><div><h3>Friendship Lore</h3><p>Nicknames, inside jokes and quotes, saved with the story of how they started.</p></div><div><h3>Just your people</h3><p>Each vault is private. Friends join only through an invitation you share.</p></div></div><blockquote>”It&apos;s not lost, it&apos;s on an adventure.”<cite>— Sam, about the car keys · saved in Lore</cite></blockquote><div className="capsule-card"><div><p className="eyebrow">✧ time capsules</p><h2>Write to your future selves.</h2><p>Seal a letter and pick a date. Nobody — not even you — can read it until that day arrives.</p></div><div className="capsule-note"><span className="envelope">✉</span><h3>Open on our 10-year reunion</h3><p>Sealed by Jordan · unlocks July 2028</p><div className="progress"><span /></div></div></div><div className="bottom-cta"><h2>Start keeping what matters.</h2><Link className="pill pill-primary" href="/dashboard">Open my vaults</Link></div></div></section>
  </>;
}
