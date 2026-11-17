import { useEffect, useState } from "react";
import { fetchContacts } from "../api";
import { useLanguage } from "../context/LanguageContext";

export default function Contacts() {
  const { lang, ui } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchContacts(lang)
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
    <section className="page contacts-page">
      <header className="page-header">
        <h1>{data.title}</h1>
        <p>{data.lead}</p>
      </header>

      <div className="contacts-layout">
        <dl className="contact-facts">
          <div>
            <dt>{data.addressLabel}</dt>
            <dd>{data.address}</dd>
          </div>
          <div>
            <dt>{data.hoursLabel}</dt>
            <dd>{data.hours}</dd>
          </div>
          <div>
            <dt>{data.phoneLabel}</dt>
            <dd>
              <a href={`tel:${data.phone.replace(/\s|\(|\)|-/g, "")}`}>
                {data.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt>{data.emailLabel}</dt>
            <dd>
              <a href={`mailto:${data.email}`}>{data.email}</a>
            </dd>
          </div>
          {data.whatsappUrl ? (
            <div>
              <dt>{ui?.contactsWhatsApp || data.phoneLabel}</dt>
              <dd>
                <a
                  className="btn btn-primary"
                  href={data.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {ui?.contactsWhatsApp}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>

        <aside className="contact-map" aria-label="Map">
          <div className="map-frame map-frame-live">
            {data.mapEmbedUrl ? (
              <iframe
                title={data.addressLabel}
                src={data.mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : null}
            <p>{data.mapNote}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
