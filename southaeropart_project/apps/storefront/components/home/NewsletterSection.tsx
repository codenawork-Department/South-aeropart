export function NewsletterSection() {
  return (
    <section className="py-12 md:py-16">
      <div className="container-main">
        <div className="card p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="heading-md">
              STAY <span className="text-[var(--accent-red)]">UPDATED</span>
            </h2>
            <p className="body-sm mt-2 max-w-md">
              Subscribe to receive the latest news, events, product information, and more.
            </p>
          </div>
          <div className="flex w-full md:w-auto gap-0">
            <input
              type="email"
              placeholder="Enter your email"
              className="input-dark flex-1 md:w-72 rounded-none"
              id="newsletter-email-home"
            />
            <button className="btn-primary rounded-none whitespace-nowrap" id="subscribe-home">
              SUBSCRIBE
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
