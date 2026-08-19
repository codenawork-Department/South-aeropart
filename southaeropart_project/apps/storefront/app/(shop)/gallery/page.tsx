export default function GalleryPage() {
  return (
    <div className="container-main py-20">
      <h1 className="heading-xl text-center">
        <span className="text-[var(--accent-red)]">GALLERY</span>
      </h1>
      <p className="body-lg text-center mt-4 max-w-lg mx-auto">
        Browse our builds, installations, and customer showcases. Coming soon.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square placeholder-image rounded-sm">
            <span>Gallery Image {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
