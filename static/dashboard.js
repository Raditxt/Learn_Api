// Register the datalabels plugin globally
Chart.register(ChartDataLabels);

const BASE_URL = 'http://127.0.0.1:5000'; // Sesuaikan jika backend Anda berjalan di port/host lain

// Get DOM elements
const yearSelect = document.getElementById('yearFilter');
const quarterSelect = document.getElementById('quarterFilter');
const topNSalesCategoryInput = document.getElementById('topNSalesCategoryInput');
const topNBrandInput = document.getElementById('topNBrandInput');
const topNCustomersInput = document.getElementById('topNCustomersInput');
const topNDeliveryEmployeeInput = document.getElementById('topNDeliveryEmployeeInput');
const applyFiltersBtn = document.getElementById('applyFilters');

// KPI containers (new IDs for loading overlays)
const kpiTotalSalesContainer = document.getElementById('kpiTotalSalesContainer');
const kpiTotalOrdersContainer = document.getElementById('kpiTotalOrdersContainer');
const kpiAvgSalesPerOrderContainer = document.getElementById('kpiAvgSalesPerOrderContainer');

const kpiTotalSales = document.getElementById('kpiTotalSales');
const kpiTotalOrders = document.getElementById('kpiTotalOrders');
const kpiAvgSalesPerOrder = document.getElementById('kpiAvgSalesPerOrder');

// Chart instances
let monthlySalesChart, salesByCategoryChart, salesByBrandChart, topCustomersChart,
    deliveryStatusChart, avgDeliveryTimeChart, employeeDeliveryChart, ratingDistributionChart;

// --- Helper Functions ---

function formatCurrency(amount) {
    // Handle null/undefined values by returning 0 or a dash
    if (amount === null || typeof amount === 'undefined') return 'N/A';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function formatNumber(num) {
    if (num === null || typeof num === 'undefined') return 'N/A';
    return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Manages loading/error overlays for a given container.
 * @param {string} containerId ID of the parent container (e.g., 'monthlySalesChartContainer', 'kpiTotalSalesContainer').
 * @param {boolean} showLoading True to show loading, false to hide loading and error.
 * @param {boolean} showError True to show error message (only if showLoading is false).
 * @param {string} errorMessage The message to display on error.
 */
function updateOverlay(containerId, showLoading = false, showError = false, errorMessage = 'Gagal memuat data.') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container with ID ${containerId} not found.`);
        return;
    }

    const loadingOverlay = container.querySelector('.loading-overlay');
    const errorOverlay = container.querySelector('.error-overlay');
    const actualContent = container.querySelector('canvas') || container.querySelector('p:not(.loading-overlay p, .error-overlay p)');

    if (showLoading) {
        if (loadingOverlay) loadingOverlay.classList.remove('hidden-overlay');
        if (errorOverlay) errorOverlay.classList.add('hidden-overlay');
        if (actualContent) actualContent.style.opacity = '0'; // Hide content smoothly
    } else if (showError) {
        if (loadingOverlay) loadingOverlay.classList.add('hidden-overlay');
        if (errorOverlay) {
            errorOverlay.classList.remove('hidden-overlay');
            errorOverlay.querySelector('p').textContent = errorMessage;
        }
        if (actualContent) actualContent.style.opacity = '0'; // Keep content hidden for error
    } else {
        // Hide both, show content
        if (loadingOverlay) loadingOverlay.classList.add('hidden-overlay');
        if (errorOverlay) errorOverlay.classList.add('hidden-overlay');
        if (actualContent) actualContent.style.opacity = '1'; // Show content
    }
}

function destroyChart(chartInstance) {
    if (chartInstance) {
        chartInstance.destroy();
    }
}

// --- Data Loading Functions ---

async function loadKPIs(year = '') {
    updateOverlay('kpiTotalSalesContainer', true);
    updateOverlay('kpiTotalOrdersContainer', true);
    updateOverlay('kpiAvgSalesPerOrderContainer', true);
    try {
        let url = `${BASE_URL}/api/kpis`;
        if (year) url += `?year=${year}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengambil data KPI.');
        const data = await res.json();
        
        kpiTotalSales.textContent = formatCurrency(data.TotalPenjualan);
        kpiTotalOrders.textContent = formatNumber(data.TotalPesanan);
        kpiAvgSalesPerOrder.textContent = formatCurrency(data.RataRataPenjualanPerPesanan);
        
        updateOverlay('kpiTotalSalesContainer', false);
        updateOverlay('kpiTotalOrdersContainer', false);
        updateOverlay('kpiAvgSalesPerOrderContainer', false);

    } catch (e) {
        console.error("Error fetching KPIs:", e);
        updateOverlay('kpiTotalSalesContainer', false, true, 'N/A');
        updateOverlay('kpiTotalOrdersContainer', false, true, 'N/A');
        updateOverlay('kpiAvgSalesPerOrderContainer', false, true, 'N/A');
    }
}

async function loadMonthlySales(year = '', quarter = '') {
    destroyChart(monthlySalesChart);
    updateOverlay('monthlySalesChartContainer', true);
    try {
        let url = `${BASE_URL}/api/sales/monthly-trend`;
        const params = new URLSearchParams();
        if (year) params.append('year', year);
        if (quarter) params.append('quarter', quarter);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengambil tren penjualan bulanan.');
        const data = await res.json();

        const labels = data.map(item => item.BulanPenjualan);
        const salesData = data.map(item => item.TotalPenjualan);
        const orderData = data.map(item => item.JumlahPesanan);

        const ctx = document.getElementById('monthlySalesChart').getContext('2d');
        monthlySalesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Penjualan',
                        data: salesData,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.2)',
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y',
                        datalabels: {
                            display: false
                        }
                    },
                    {
                        label: 'Jumlah Pesanan',
                        data: orderData,
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.2)',
                        fill: false,
                        tension: 0.3,
                        yAxisID: 'y1',
                        datalabels: {
                            display: false
                        }
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Total Penjualan (IDR)'
                        },
                        ticks: {
                            callback: function(value, index, ticks) {
                                return formatCurrency(value);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                        title: {
                            display: true,
                            text: 'Jumlah Pesanan'
                        },
                        ticks: {
                            callback: function(value, index, ticks) {
                                return formatNumber(value);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.dataset.label === 'Total Penjualan') {
                                    label += formatCurrency(context.raw);
                                } else {
                                    label += formatNumber(context.raw);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
        updateOverlay('monthlySalesChartContainer', false);
    } catch (e) {
        console.error("Error loading monthly sales:", e);
        updateOverlay('monthlySalesChartContainer', false, true, 'Gagal memuat data tren penjualan.');
    }
}

async function loadSalesByCategory(year = '', topN = 10) {
    destroyChart(salesByCategoryChart);
    updateOverlay('salesByCategoryChartContainer', true);
    try {
        let url = `${BASE_URL}/api/sales/by-category?top_n=${topN}`;
        if (year) url += `&year=${year}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengambil penjualan per kategori.');
        const data = await res.json();

        const labels = data.map(item => item.nama_kategori);
        const salesData = data.map(item => item.TotalPenjualan);

        const ctx = document.getElementById('salesByCategoryChart').getContext('2d');
        salesByCategoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Penjualan',
                    data: salesData,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)', // Green
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Make it horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Penjualan (IDR)'
                        },
                        ticks: {
                            callback: function(value, index, ticks) {
                                return formatCurrency(value);
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Kategori'
                        }
                    }
                },
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        formatter: (value) => formatCurrency(value),
                        color: '#333',
                        font: {
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Total Penjualan: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                }
            }
        });
        updateOverlay('salesByCategoryChartContainer', false);
    } catch (e) {
        console.error("Error loading sales by category:", e);
        updateOverlay('salesByCategoryChartContainer', false, true, 'Gagal memuat data penjualan per kategori.');
    }
}

async function loadSalesByBrand(year = '', topN = 10) {
    destroyChart(salesByBrandChart);
    updateOverlay('salesByBrandChartContainer', true);
    try {
        let url = `${BASE_URL}/api/sales/by-brand?top_n=${topN}`;
        if (year) url += `&year=${year}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengambil penjualan per brand.');
        const data = await res.json();

        const labels = data.map(item => item.brand);
        const salesData = data.map(item => item.TotalPenjualan);

        const ctx = document.getElementById('salesByBrandChart').getContext('2d');
        salesByBrandChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Penjualan',
                    data: salesData,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Make it horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Penjualan (IDR)'
                        },
                        ticks: {
                            callback: function(value, index, ticks) {
                                return formatCurrency(value);
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Brand'
                        }
                    }
                },
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        formatter: (value) => formatCurrency(value),
                        color: '#333',
                        font: {
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Total Penjualan: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                }
            }
        });
        updateOverlay('salesByBrandChartContainer', false);
    } catch (e) {
        console.error("Error loading sales by brand:", e);
        updateOverlay('salesByBrandChartContainer', false, true, 'Gagal memuat data penjualan per brand.');
    }
}

async function loadTopCustomers(year = '', topN = 10) {
    destroyChart(topCustomersChart);
    updateOverlay('topCustomersChartContainer', true);
    try {
        let url = `${BASE_URL}/api/customers/top-spenders?top_n=${topN}`;
        if (year) url += `&year=${year}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengambil data pelanggan teratas.');
        const data = await res.json();

        const labels = data.map(item => item.NamaPelanggan);
        const totalPembelian = data.map(item => item.TotalPembelian);

        const ctx = document.getElementById('topCustomersChart').getContext('2d');
        topCustomersChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Pembelian',
                    data: totalPembelian,
                    backgroundColor: 'rgba(67, 56, 202, 0.8)', // violet-600
                    borderColor: 'rgba(67, 56, 202, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Make it horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Pembelian (IDR)'
                        },
                        ticks: {
                            callback: function(value, index, ticks) {
                                return formatCurrency(value);
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Pelanggan'
                        }
                    }
                },
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        formatter: (value) => formatCurrency(value),
                        color: '#333',
                        font: {
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Total Pembelian: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                }
            }
        });
        updateOverlay('topCustomersChartContainer', false);
    } catch (e) {
        console.error("Error loading top customers:", e);
        updateOverlay('topCustomersChartContainer', false, true, 'Gagal memuat data pelanggan teratas.');
    }
}

async function loadDeliveryStatus(year = '') {
    destroyChart(deliveryStatusChart); // Pastikan ini menghancurkan chart lama
    updateOverlay('deliveryStatusChartContainer', true);
    try {
        let url = `${BASE_URL}/api/delivery/status-distribution`;
        if (year) url += `?year=${year}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengambil distribusi status pengiriman.');
        const data = await res.json();

        // --- Bagian Penting yang Mungkin Bermasalah ---
        const labels = data.map(item => item.status_pengiriman);
        const counts = data.map(item => item.JumlahPesanan);
        const percentages = data.map(item => parseFloat(item.Persentase)); // Persentase dari string ke number

        const backgroundColors = [
            'rgba(16, 185, 129, 0.8)', // emerald-500 (Terkirim)
            'rgba(59, 130, 246, 0.8)', // blue-500 (Dalam Pengiriman)
            'rgba(245, 158, 11, 0.8)', // amber-500 (Tertunda)
            'rgba(239, 68, 68, 0.8)',  // red-500 (Dibatalkan)
            'rgba(201, 203, 207, 0.8)' // Grey (Other)
        ];
        const borderColors = [
            'rgba(16, 185, 129, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(201, 203, 207, 1)'
        ];

        const ctx = document.getElementById('deliveryStatusChart').getContext('2d');
        deliveryStatusChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderColor: borderColors.slice(0, labels.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        formatter: (value, context) => {
                            const percentage = percentages[context.dataIndex];
                            // If total is 0, avoid division by zero
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            if (total === 0) return '0%';

                            return `${context.chart.data.labels[context.dataIndex]}\n(${percentage.toFixed(1)}%)`;
                        },
                        color: '#fff',
                        font: {
                            weight: 'bold'
                        },
                        textShadowBlur: 4,
                        textShadowColor: 'rgba(0, 0, 0, 0.5)'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const value = context.raw;
                                const percentage = percentages[context.dataIndex];
                                return `${label} ${formatNumber(value)} (${percentage.toFixed(1)}%)`;
                            }
                        }
                    }
                }
            }
        });
        updateOverlay('deliveryStatusChartContainer', false);
    } catch (e) {
        console.error("Error loading delivery status:", e);
        updateOverlay('deliveryStatusChartContainer', false, true, 'Gagal memuat data status pengiriman.');
    }
}
async function loadAvgDeliveryTime(year = '') {
    destroyChart(avgDeliveryTimeChart);
    updateOverlay('avgDeliveryTimeChartContainer', true);
    try {
        let url = `${BASE_URL}/api/delivery/avg-time-by-courier`;
        if (year) url += `?year=${year}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengambil rata-rata waktu pengiriman.');
        const data = await res.json();

        if (data.length === 0) {
            updateOverlay('avgDeliveryTimeChartContainer', false, true, 'Tidak ada data.');
            return;
        }

        const labels = data.map(item => item.kurir || 'Tidak Diketahui');
        const avgDays = data.map(item => parseFloat(item.RataRataHariPengiriman || 0));

        const ctx = document.getElementById('avgDeliveryTimeChart').getContext('2d');
        avgDeliveryTimeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Rata-rata Hari Pengiriman',
                    data: avgDays,
                    backgroundColor: 'rgba(249, 115, 22, 0.8)', // Slightly darker orange
                    borderColor: 'rgba(249, 115, 22, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Rata-rata Hari'
                        },
                        ticks: {
                            callback: function(value) {
                                return `${value.toFixed(1)}`;
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Kurir'
                        }
                    }
                },
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        formatter: (value) => `${value.toFixed(1)} Hari`,
                        color: '#333',
                        font: {
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Rata-rata Hari: ${context.raw.toFixed(1)}`;
                            }
                        }
                    }
                }
            }
        });
        updateOverlay('avgDeliveryTimeChartContainer', false);
    } catch (e) {
        console.error("Error loading average delivery time:", e);
        updateOverlay('avgDeliveryTimeChartContainer', false, true, 'Gagal memuat data waktu pengiriman.');
    }
}
async function loadEmployeeDeliveryPerformance(year = '', topN = 10) {
    destroyChart(employeeDeliveryChart);
    updateOverlay('employeeDeliveryChartContainer', true);
    try {
        let url = `${BASE_URL}/api/delivery/employee-performance?top_n=${topN}`;
        if (year) url += `&year=${year}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengambil performa karyawan pengiriman.');
        const data = await res.json();

        if (data.length === 0) {
            updateOverlay('employeeDeliveryChartContainer', false, true, 'Tidak ada data.');
            return;
        }

        const labels = data.map(item => item.nama_karyawan || 'Tidak Diketahui');
        const totalDeliveries = data.map(item => parseInt(item.TotalPengiriman || 0));
        const avgDeliveryDays = data.map(item => parseFloat(item.RataRataHariPengiriman || 0));

        const ctx = document.getElementById('employeeDeliveryChart').getContext('2d');
        employeeDeliveryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Pengiriman',
                        data: totalDeliveries,
                        backgroundColor: 'rgba(107, 114, 128, 0.7)', // Slightly darker gray
                        borderColor: 'rgba(107, 114, 128, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Rata-rata Hari Pengiriman',
                        data: avgDeliveryDays,
                        type: 'line',
                        borderColor: 'rgba(239, 68, 68, 0.9)', // Slightly darker red
                        backgroundColor: 'transparent',
                        fill: false,
                        yAxisID: 'y1',
                        datalabels: {
                            formatter: (value) => value.toFixed(1),
                            color: 'rgba(239, 68, 68, 1)',
                            align: 'end'
                        }
                    }
                ]
            },
            options: {
                indexAxis: 'y', // Horizontal
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Nilai'
                        }
                    },
                    y: { // Left axis for Total Pengiriman (Bar)
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Total Pengiriman'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatNumber(value);
                            }
                        }
                    },
                    y1: { // Right axis for Rata-rata Hari (Line)
                        type: 'linear',
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                        title: {
                            display: true,
                            text: 'Rata-rata Hari'
                        }
                    }
                },
                plugins: {
                    datalabels: {
                        formatter: (value, context) => {
                            if (context.datasetIndex === 0) { // Only for bar chart (Total Pengiriman)
                                return formatNumber(value);
                            }
                            return null; // Line chart datalabels handled directly in dataset
                        },
                        color: '#333',
                        font: {
                            weight: 'bold'
                        },
                        anchor: 'end',
                        align: 'end'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.dataset.label === 'Total Pengiriman') {
                                    label += formatNumber(context.raw);
                                } else {
                                    label += `${context.raw.toFixed(1)} Hari`;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
        updateOverlay('employeeDeliveryChartContainer', false);
    } catch (e) {
        console.error("Error loading employee delivery performance:", e);
        updateOverlay('employeeDeliveryChartContainer', false, true, 'Gagal memuat performa karyawan pengiriman.');
    }
}

async function loadRatingDistribution(year = '') {
    destroyChart(ratingDistributionChart);
    updateOverlay('ratingDistributionChartContainer', true);
    try {
        let url = `${BASE_URL}/api/rating/distribution`;
        if (year) url += `?year=${year}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengambil distribusi rating.');
        const data = await res.json();

        if (data.length === 0) {
            updateOverlay('ratingDistributionChartContainer', false, true, 'Tidak ada data.');
            return;
        }

        const labels = data.map(item => `Rating ${item.rating_belanja}`);
        const counts = data.map(item => parseInt(item.JumlahRating || 0));
        const percentages = data.map(item => parseFloat(item.Persentase || 0));

        const backgroundColors = [
            'rgba(74, 222, 128, 0.8)', // Green (5 stars)
            'rgba(163, 230, 53, 0.8)', // Light Green (4 stars)
            'rgba(250, 204, 21, 0.8)', // Yellow (3 stars)
            'rgba(251, 146, 60, 0.8)', // Orange (2 stars)
            'rgba(239, 68, 68, 0.8)'   // Red (1 star)
        ].reverse();
        const borderColors = [
            'rgba(74, 222, 128, 1)',
            'rgba(163, 230, 53, 1)',
            'rgba(250, 204, 21, 1)',
            'rgba(251, 146, 60, 1)',
            'rgba(239, 68, 68, 1)'
        ].reverse();

        const ctx = document.getElementById('ratingDistributionChart').getContext('2d');
        ratingDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderColor: borderColors.slice(0, labels.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        formatter: (value, context) => {
                            const percentage = percentages[context.dataIndex];
                             const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            if (total === 0) return '0%';
                            return `${context.chart.data.labels[context.dataIndex]}\n(${percentage.toFixed(1)}%)`;
                        },
                        color: '#fff',
                        font: {
                            weight: 'bold'
                        },
                        textShadowBlur: 4,
                        textShadowColor: 'rgba(0, 0, 0, 0.5)'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const value = context.raw;
                                const percentage = percentages[context.dataIndex];
                                return `${label} ${formatNumber(value)} (${percentage.toFixed(1)}%)`;
                            }
                        }
                    }
                }
            }
        });
        updateOverlay('ratingDistributionChartContainer', false);
    } catch (e) {
        console.error("Error loading rating distribution:", e);
        updateOverlay('ratingDistributionChartContainer', false, true, 'Gagal memuat data rating.');
    }
}

async function loadYears() {
    try {
        const res = await fetch(`${BASE_URL}/api/available-years`);
        if (!res.ok) throw new Error('Gagal mengambil tahun yang tersedia.');
        const years = await res.json();

        // Clear existing options
        yearSelect.innerHTML = '<option value="">Semua Tahun</option>';

        // Populate with new years
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });

        // Set default to latest year if available, or 'Semua Tahun'
        if (years.length > 0) {
            yearSelect.value = years[0]; // Assuming latest year is first due to ORDER BY Tahun DESC
        } else {
            yearSelect.value = '';
        }

    } catch (e) {
        console.error("Error loading available years:", e);
        // Fallback for years if API fails
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '<option value="">Semua Tahun</option>';
        for (let i = 0; i < 5; i++) {
            const year = currentYear - i;
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
        yearSelect.value = currentYear;
    }
}

// --- Main Data Loading Function ---
const loadAllDashboardData = () => {
    const selectedYear = yearSelect.value;
    const selectedQuarter = quarterSelect.value;
    const topNCategory = parseInt(topNSalesCategoryInput.value) || 10;
    const topNBrand = parseInt(topNBrandInput.value) || 10;
    const topNCustomers = parseInt(topNCustomersInput.value) || 10;
    const topNDeliveryEmployee = parseInt(topNDeliveryEmployeeInput.value) || 10;

    loadKPIs(selectedYear);
    loadMonthlySales(selectedYear, selectedQuarter);
    loadSalesByCategory(selectedYear, topNCategory);
    loadSalesByBrand(selectedYear, topNBrand);
    loadTopCustomers(selectedYear, topNCustomers);
    loadDeliveryStatus(selectedYear);
    loadAvgDeliveryTime(selectedYear);
    loadEmployeeDeliveryPerformance(selectedYear, topNDeliveryEmployee);
    loadRatingDistribution(selectedYear);
};

// --- Event Listeners ---
applyFiltersBtn.addEventListener('click', loadAllDashboardData);

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    loadYears().then(() => {
        // After years are loaded, load all dashboard data based on initial filters
        loadAllDashboardData();
    });
});

  // Dapatkan nama file halaman saat ini
  const currentPage = window.location.pathname.split("/").pop();

  // Cari semua link dengan class .nav-link
  const links = document.querySelectorAll(".nav-link");

  links.forEach(link => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.remove("text-gray-600");
      link.classList.add("text-black", "border-b-2", "border-black");
    }
  });