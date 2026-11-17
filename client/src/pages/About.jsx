import { useEffect, useState } from "react";
import { fetchAbout } from "../api";
import { useLanguage } from "../context/LanguageContext";

export default function About() {
  const { lang, ui } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAbout(lang)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lang]);

  if (loading) return <div className="page-state">{ui?.loading}</div>;
  if (error) {
    return (
      <div className="page-state">
        {ui?.apiError}: {error}
      </div>
    );
  }
  if (!data) return null;

  return (
    <section className="page about-page">
      <header className="page-header">
        <h1>{data.title}</h1>
        <p className="lead">{data.lead}</p>
      </header>

      <div className="about-layout">
        <div className="about-visual" aria-hidden="true">
          <div className="about-panel" />
          <div className="about-seal">茶</div>
        </div>
        <div className="about-copy">
          <p>{data.body}</p>
          <ul className="value-list">
            {data.values.map((value) => (
              <li key={value.title}>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
