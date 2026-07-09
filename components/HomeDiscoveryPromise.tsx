type PromiseBeat = {
  title: string;
};

type HomeDiscoveryPromiseProps = {
  title: string;
  lead: string;
  beats: readonly PromiseBeat[];
};

export function HomeDiscoveryPromise({ title, lead, beats }: HomeDiscoveryPromiseProps) {
  return (
    <div className="discovery-promise">
      <div className="discovery-promise__intro">
        <h2 id="discovery-promise-title" className="discovery-promise__title">
          {title}
        </h2>
        <p className="discovery-promise__lead">{lead}</p>
      </div>

      <ul className="discovery-promise__beats">
        {beats.map((beat) => (
          <li className="discovery-promise__beat" key={beat.title}>
            <p className="discovery-promise__beat-title">{beat.title}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
