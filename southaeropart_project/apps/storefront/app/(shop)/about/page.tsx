export default function AboutPage() {
  return (
    <div className="container-main py-20">
      <h1 className="heading-xl text-center">
        ABOUT <span className="text-[var(--accent-red)]">US</span>
      </h1>
      <p className="font-heading text-sm tracking-[0.2em] text-[var(--text-secondary)] text-center mt-3 uppercase">
        Not Loud, Just Different.
      </p>

      <div className="max-w-2xl mx-auto mt-12 space-y-6">
        <p className="body-lg">
          South Aero Performance was born from a passion for aerodynamic engineering and automotive design. 
          We don&apos;t follow trends, we build performance. Every product is tested, refined, and crafted 
          for those who demand more.
        </p>
        <p className="body-md">
          Our mission is to deliver functional aerodynamic components that enhance both the performance 
          and visual appeal of your vehicle. Every body kit, spoiler, and diffuser is precision-engineered 
          using CFD analysis and real-world testing.
        </p>

        <div className="aspect-video placeholder-image rounded-sm mt-10">
          <span>South Aero Workshop / Team Photo</span>
        </div>
      </div>
    </div>
  );
}
