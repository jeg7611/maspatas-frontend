const DashboardPage = () => {
  const cards = [
    { title: 'Products', value: '120', hint: 'Active catalog items' },
    { title: 'Customers', value: '86', hint: 'Registered customers' },
    { title: 'Open Sales', value: '14', hint: 'Pending transactions' },
    { title: 'Inventory Alerts', value: '6', hint: 'Low stock products' },
  ];

  return (
    <section>
      <h2>Dashboard</h2>
      <p>This is your summary area with quick business insights.</p>
      <div className="card-grid">
        {cards.map((card) => (
          <article key={card.title} className="summary-card">
            <h3>{card.title}</h3>
            <strong>{card.value}</strong>
            <span>{card.hint}</span>
          </article>
        ))}
      </div>
    </section>
  );
};

export default DashboardPage;
