function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;

  if (index === 0) {
    return 0.15; // 15% — лидер по прибыли
  } else if (index === 1 || index === 2) {
    return 0.10; // 10% — второе и третье место
  } else if (index === total - 1) {
    return 0.00; // 0% — последний
  } else {
    return 0.05; // 5% — все остальные
  }
}

function calculateSimpleRevenue(purchase, _product) {
  const discountFactor = 1 - purchase.discount / 100;
  return purchase.sale_price * purchase.quantity * discountFactor;
}

function analyzeSalesData(data, options) {
  // Проверка функций
  const { calculateRevenue, calculateBonus } = options;
  if (
    !calculateRevenue ||
    !calculateBonus ||
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Не определены функции для расчетов");
  }

  // 2. Статистика продавцов
  const sellerStats = data.sellers.map(seller => ({
    seller_id: seller.id,
    full_name: `${seller.first_name} ${seller.last_name}`,
    sales_count: 0,
    revenue: 0,
    profit: 0,
    bonus: 0,
    products_sold: {},
  }));

  // 3. Индексы
  const sellerIndex = Object.fromEntries(
    sellerStats.map(stat => [stat.seller_id, stat])
  );
  const productIndex = Object.fromEntries(
    data.products.map(product => [product.sku, product])
  );

  // 4. Перебор чеков и товаров
  data.purchase_records.forEach(record => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    record.items.forEach(item => {
      const product = productIndex[item.sku];
      if (!product) return;

      const cost = product.purchase_price * item.quantity;
      const revenue = calculateRevenue(item, product);
      const profit = revenue - cost;

      seller.profit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // 5. Сортировка по прибыли (убывание)
  sellerStats.sort((a, b) => b.profit - a.profit);

  // 6. Расчёт бонусов и топ-10 товаров
  const totalSellers = sellerStats.length;
  sellerStats.forEach((stat, index) => {
    const rate = calculateBonus(index, totalSellers, stat);
    stat.bonus = +(stat.profit * rate).toFixed(2);

    stat.top_products = Object.entries(stat.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // 7. Итоговый отчёт
  return sellerStats.map(seller => ({
    seller_id: seller.seller_id,
    name: seller.full_name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}
