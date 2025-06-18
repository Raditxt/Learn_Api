// Define the base URL for your Flask API
const BASE_URL = 'http://127.0.0.1:5000'; 

// Get references to DOM elements for Sales
const salesForm = document.getElementById('sales-form');
const salesListBody = document.getElementById('sales-list-body');
const salesMessageArea = document.getElementById('message-area'); 
const noSalesMessage = document.getElementById('no-sales-message');
const updateSalesModal = document.getElementById('update-sales-modal');
const closeSalesModalButton = document.getElementById('close-sales-modal-button');
const cancelSalesUpdateButton = document.getElementById('cancel-sales-update-button');
const updateSalesForm = document.getElementById('update-sales-form');


// Function to display messages (success or error)
function showMessage(message, type = 'success') {
    salesMessageArea.textContent = message;
    salesMessageArea.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
    if (type === 'success') {
        salesMessageArea.classList.add('bg-green-100', 'text-green-800');
    } else {
        salesMessageArea.classList.add('bg-red-100', 'text-red-800');
    }
    salesMessageArea.classList.remove('hidden');
    setTimeout(() => {
        salesMessageArea.classList.add('hidden');
    }, 5000); 
}

// Helper function to format a date string to YYYY-MM-DD
function formatAsYYYYMMDD(dateString) {
    if (!dateString) return '';
    try {
        // If it's already in YYYY-MM-DD format, return it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        const date = new Date(dateString);
        // Check if the date is valid after parsing
        if (isNaN(date.getTime())) {
            return ''; // Invalid date string
        }
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date:", e);
        return ''; // Return empty string on error
    }
}

// Fungsi untuk mengambil dan menampilkan transaksi penjualan
async function fetchSales() {
    console.log('Fetching sales from ' + BASE_URL + '/api/sales...');
    try {
        const response = await fetch(BASE_URL + '/api/sales');
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Network response was not ok (sales):', response.status, errorText);
            throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorText}`);
        }
        
        const sales = await response.json();
        console.log('Sales fetched:', sales);
        renderSales(sales);
    } catch (error) {
        console.error('Error fetching sales:', error);
        showMessage(`Failed to fetch sales: ${error.message}`, 'error');
        noSalesMessage.classList.remove('hidden'); 
        salesListBody.innerHTML = ''; 
    }
}

// Fungsi untuk merender transaksi penjualan dalam tabel
function renderSales(sales) {
    salesListBody.innerHTML = ''; 
    console.log('Rendering sales. Number of sales:', sales.length);

    if (!Array.isArray(sales) || sales.length === 0) {
        console.log('No sales to render or data is not an array.');
        noSalesMessage.classList.remove('hidden'); 
        return;
    }
    noSalesMessage.classList.add('hidden'); 

    sales.forEach(sale => {
        const row = salesListBody.insertRow();
        row.classList.add('hover:bg-gray-50', 'transition', 'duration-100', 'ease-in-out');
        // Mengakses properti berdasarkan struktur tabel fakta_penjualan yang baru
        const id_detail = sale.id_detail || '';
        const id_produk = sale.id_produk || '';
        const id_pelanggan = sale.id_pelanggan || '';
        const id_pesanan = sale.id_pesanan || '';
        const jumlah = sale.jumlah || '';
        const harga_satuan = sale.harga_satuan || '';
        const total_harga = sale.total_harga || '';
        // Ensure tanggal_pesanan is formatted for display in the table
        const tanggal_pesanan = formatAsYYYYMMDD(sale.tanggal_pesanan) || ''; 
        const status_pesanan = sale.status_pesanan || '';


        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${id_detail}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${id_produk}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${id_pelanggan}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${id_pesanan}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${jumlah}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${harga_satuan}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${total_harga}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${tanggal_pesanan}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${status_pesanan}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="edit-sales-btn px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 mr-2 transition duration-150 ease-in-out shadow-sm" 
                    data-id="${id_detail}" 
                    data-produk="${id_produk}" 
                    data-pelanggan="${id_pelanggan}" 
                    data-pesanan="${id_pesanan}" 
                    data-jumlah="${jumlah}" 
                    data-harga-satuan="${harga_satuan}" 
                    data-total-harga="${total_harga}"
                    data-tanggal-pesanan="${tanggal_pesanan}"
                    data-status-pesanan="${status_pesanan}">
                    Edit
                </button>
                <button class="delete-sales-btn px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-150 ease-in-out shadow-sm" data-id="${id_detail}">
                    Delete
                </button>
            </td>
        `;
    });
}

// Event listener for adding a new sales transaction
salesForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(salesForm);
    const salesData = Object.fromEntries(formData.entries());
    salesData.jumlah = parseInt(salesData.jumlah); 
    salesData.harga_satuan = parseFloat(salesData.harga_satuan); 
    salesData.total_harga = parseFloat(salesData.total_harga); 

    console.log('Adding new sales transaction:', salesData);

    try {
        const response = await fetch(BASE_URL + '/api/sales', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(salesData)
        });

        const result = await response.json();
        console.log('Add sales response:', result);

        if (response.ok) {
            showMessage(result.message, 'success');
            salesForm.reset(); 
            fetchSales(); 
        } else {
            showMessage(result.error || 'Failed to add sales transaction.', 'error');
        }
    } catch (error) {
        console.error('Error adding sales transaction:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Event delegation for Sales Edit and Delete buttons
salesListBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-sales-btn')) {
        const id_detail = e.target.dataset.id;
        const id_produk = e.target.dataset.produk;
        const id_pelanggan = e.target.dataset.pelanggan;
        const id_pesanan = e.target.dataset.pesanan;
        const jumlah = e.target.dataset.jumlah;
        const harga_satuan = e.target.dataset.hargaSatuan;
        const total_harga = e.target.dataset.totalHarga;
        const tanggal_pesanan = e.target.dataset.tanggalPesanan; // This should already be YYYY-MM-DD from backend
        const status_pesanan = e.target.dataset.statusPesanan;

        document.getElementById('update_sales_id_detail').value = id_detail;
        document.getElementById('update_sales_id_produk').value = id_produk;
        document.getElementById('update_sales_id_pelanggan').value = id_pelanggan;
        document.getElementById('update_sales_id_pesanan').value = id_pesanan;
        document.getElementById('update_sales_jumlah').value = jumlah;
        document.getElementById('update_sales_harga_satuan').value = harga_satuan;
        document.getElementById('update_sales_total_harga').value = total_harga;
        // Explicitly format for the date input field value
        document.getElementById('update_sales_tanggal_pesanan').value = formatAsYYYYMMDD(tanggal_pesanan); 
        document.getElementById('update_sales_status_pesanan').value = status_pesanan;


        updateSalesModal.style.display = 'flex'; 
    } else if (e.target.classList.contains('delete-sales-btn')) {
        const id_detail = e.target.dataset.id;
        const confirmationModal = document.createElement('div');
        confirmationModal.className = 'modal';
        confirmationModal.innerHTML = `
            <div class="modal-content">
                <h3 class="text-xl font-semibold mb-4 text-gray-800">Confirm Deletion</h3>
                <p class="mb-6 text-gray-700">Are you sure you want to delete sales transaction with ID: <strong>${id_detail}</strong>?</p>
                <div class="flex justify-end space-x-4">
                    <button id="confirm-delete-sales-yes" class="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 ease-in-out">Yes, Delete</button>
                    <button id="confirm-delete-sales-no" class="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200 ease-in-out">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmationModal);
        confirmationModal.style.display = 'flex';

        document.getElementById('confirm-delete-sales-yes').onclick = async () => {
            try {
                const response = await fetch(BASE_URL + `/api/sales/${id_detail}`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                console.log('Delete sales response:', result);

                if (response.ok) {
                    showMessage(result.message, 'success');
                    fetchSales(); 
                } else {
                    showMessage(result.error || 'Failed to delete sales transaction.', 'error');
                }
            } catch (error) {
                console.error('Error deleting sales transaction:', error);
                showMessage(`Error: ${error.message}`, 'error');
            } finally {
                document.body.removeChild(confirmationModal); 
            }
        };

        document.getElementById('confirm-delete-sales-no').onclick = () => {
            document.body.removeChild(confirmationModal); 
        };

        confirmationModal.addEventListener('click', (event) => {
            if (event.target === confirmationModal) {
                document.body.removeChild(confirmationModal);
            }
        });
    }
});

// Event listener for updating a sales transaction (modal form submission)
updateSalesForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id_detail = document.getElementById('update_sales_id_detail').value;
    const updatedData = {
        id_produk: document.getElementById('update_sales_id_produk').value,
        id_pelanggan: document.getElementById('update_sales_id_pelanggan').value,
        id_pesanan: document.getElementById('update_sales_id_pesanan').value,
        jumlah: parseInt(document.getElementById('update_sales_jumlah').value),
        harga_satuan: parseFloat(document.getElementById('update_sales_harga_satuan').value),
        total_harga: parseFloat(document.getElementById('update_sales_total_harga').value),
        tanggal_pesanan: document.getElementById('update_sales_tanggal_pesanan').value,
        status_pesanan: document.getElementById('update_sales_status_pesanan').value
    };

    console.log('Updating sales transaction:', id_detail, updatedData);

    try {
        const response = await fetch(BASE_URL + `/api/sales/${id_detail}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();
        console.log('Update sales response:', result);

        if (response.ok) {
            showMessage(result.message, 'success');
            updateSalesModal.style.display = 'none'; 
            fetchSales(); 
        } else {
            showMessage(result.error || 'Failed to update sales transaction.', 'error');
        }
    } catch (error) {
        console.error('Error updating sales transaction:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Close sales modal when clicking on the close button or outside the modal
closeSalesModalButton.addEventListener('click', () => {
    updateSalesModal.style.display = 'none';
});

cancelSalesUpdateButton.addEventListener('click', () => {
    updateSalesModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    // Check if the click is outside the sales update modal content
    const salesModalContent = updateSalesModal.querySelector('.modal-content');
    if (e.target === updateSalesModal && e.target !== salesModalContent && !salesModalContent.contains(e.target)) {
        updateSalesModal.style.display = 'none';
    }
});

// Add this script block to handle active navigation link
document.addEventListener('DOMContentLoaded', () => {
    fetchSales(); // Keep existing fetch

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
});
