export default function CollectionPage() {
  return (
    <div className="container-main py-20">
      <h1 className="heading-xl text-center">
        OUR <span className="text-[var(--accent-red)]">COLLECTION</span>
      </h1>
      <p className="body-lg text-center mt-4 max-w-lg mx-auto">
        Explore our complete lineup of body kits and aerodynamic components.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {[
          { name: "Accord G9 Body Kit 02", desc: "Complete aerodynamic transformation for the Honda Accord G9." },
          { name: "Civic FD Body Kit", desc: "Aggressive styling for the legendary Civic FD. Coming soon." },
          { name: "Civic FE Body Kit", desc: "Modern aero design for the Civic FE platform. Coming soon." },
          { name: "Civic FL5 Body Kit", desc: "Race-inspired kit for the Type R. Coming soon." },
        ].map((kit) => (
          <div key={kit.name} className="card p-6 group hover:border-[var(--accent-red)] transition-colors">
            <div className="aspect-video placeholder-image rounded-sm mb-4">
              <span>{kit.name} — Preview</span>
            </div>
            <h3 className="heading-sm group-hover:text-[var(--accent-red)] transition-colors">{kit.name}</h3>
            <p className="body-sm mt-2">{kit.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
