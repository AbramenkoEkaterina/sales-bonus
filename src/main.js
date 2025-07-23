// Функция расчёта выручки для одной позиции (без скидок и т.п.)
function calculateSimpleRevenue(item, product) {
  return product.sale_price * item.quantity;
}

// Функция расчёта бонуса продавца в зависимости от места по прибыли
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;
  switch (index) {
    case 0:
      return +(profit * 0.15).toFixed(2);
    case 1:
    case 2:
      return +(profit * 0.10).toFixed(2);
    case total - 1:
      return 0;
    default:
      return +(profit * 0.05).toFixed(2);
  }
}

// Основная функция анализа данных продаж
function analyzeSalesData(data, options) {
  if (!options || typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function') {
    throw new Error('Invalid options: calculateRevenue and calculateBonus functions required');
  }

  if (!data) throw new Error('Data is required');
  if (!Array.isArray(data.sellers) || !data.sellers.length) throw new Error('Sellers array is required and cannot be empty');
  if (!Array.isArray(data.products) || !data.products.length) throw new Error('Products array is required and cannot be empty');
  if (!Array.isArray(data.purchase_records) || !data.purchase_records.length) throw new Error('Purchase records array is required and cannot be empty');

  // 1. Инициализация статистики продавцов
  const sellerStats = data.sellers.map(seller => ({
    seller_id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`, // Формируем имя из first_name и last_name
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
    bonus: 0,
    top_products: []
  }));

  // 2. Создаем индексы для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map(seller => [seller.seller_id, seller])
  );

  const productIndex = Object.fromEntries(
    data.products.map(product => [product.sku, product])
  );

  // 3. Перебор чеков и подсчет статистики
  data.purchase_records.forEach(record => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return; // Если продавец не найден, пропускаем

    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    record.items.forEach(item => {
      const product = productIndex[item.sku];
      if (!product) return;

      const revenue = options.calculateRevenue(item, product);
      const cost = product.purchase_price * item.quantity;
      const profit = revenue - cost;

      seller.profit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // 4. Сортируем продавцов по убыванию прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // 5. Формируем топ-10 продуктов и бонусы
  sellerStats.forEach((seller, index) => {
    // Формируем топ-10 продуктов
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Вычисляем бонус
    seller.bonus = options.calculateBonus(index, sellerStats.length, seller);
  });

  // 6. Формируем итоговый отчет с нужным форматом чисел
  return sellerStats.map(seller => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}