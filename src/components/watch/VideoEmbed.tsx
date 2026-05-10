export default function VideoEmbed() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-ink/10 bg-ink shadow-sm">
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        {/* TODO Liam, replace REPLACE_WITH_REAL_LOOM_ID with the recorded walkthrough. */}
        <iframe
          src="https://www.loom.com/embed/REPLACE_WITH_REAL_LOOM_ID"
          title="Qwikly walkthrough"
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
