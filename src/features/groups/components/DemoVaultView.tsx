import Image from "next/image";
import Link from "next/link";

const memories = [
  { photo: "dinner", date: "Dec 21, 2023", title: "Kitchen dinner night", description: "Pasta for nine in a kitchen built for two", location: "Sam's apartment" },
  { photo: "road", date: "Sep 18, 2021", title: "Road trip to the coast", description: "Seven hours, one playlist, zero regrets", location: "Highway 1, CA" },
  { photo: "birthday", date: "May 2, 2019", title: "Rooftop birthday", description: "Maya turns 25 and the candles refuse to light", location: "Brooklyn, NY" },
  { photo: "lake", date: "Jul 16, 2016", title: "First lake summer", description: "The beginning of all those summers together", location: "The lake house" },
];

export default function DemoVaultView() {
  return <section className="group-page paper"><div className="group-container">
    <div className="group-cover"><Image src="/lake-vault-cover.png" alt="Lake house at sunrise" fill priority sizes="(min-width: 1200px) 1120px, 100vw" className="object-cover" /></div>
    <div className="group-heading"><div><p className="group-private">♙&nbsp; JUST YOUR CIRCLE</p><h1>The Lake House Crew</h1><p className="group-description">Ten summers, one leaky canoe, and far too many sunsets.</p><p className="group-since">Keeping memories since October 2016</p></div><div className="group-heading-actions"><Link className="pill pill-primary" href="/login">Create your own vault</Link></div></div>
    <div className="group-invite-card"><div className="group-invite-copy"><span className="group-key">⚿</span><div><p>Sample vault</p><code>Your memories deserve a place like this.</code></div></div><Link className="pill pill-outline" href="/login">Start yours</Link></div>
    <section className="group-people" aria-labelledby="sample-people-heading"><div className="group-people-list"><h2 id="sample-people-heading">♙&nbsp; Your people</h2>{["Jordan", "Maya", "Sam", "Alex"].map((name, index) => <div className="group-person" key={name}><span className="group-person-avatar">{name[0]}</span><div><strong>{name}</strong><small>{index === 0 ? "Vault owner" : "Friend"}</small></div></div>)}</div><div className="group-counts"><div><strong>4</strong><span>Friends</span></div><div><strong>4</strong><span>Memories</span></div></div></section>
    <section className="recent-memories" aria-labelledby="sample-recent-heading"><div className="recent-heading"><div><p className="eyebrow">the moments that stay</p><h2 id="sample-recent-heading">Recent memories</h2></div></div><div className="recent-grid">{memories.map((memory) => <article className="recent-card" key={memory.title}><div className={`recent-photo demo-photo demo-photo-${memory.photo}`} role="img" aria-label={memory.title} /><div className="recent-card-copy"><time>{memory.date}</time><h3>{memory.title}</h3><p>{memory.description}</p><small>♧&nbsp; {memory.location}</small></div></article>)}</div></section>
  </div></section>;
}
