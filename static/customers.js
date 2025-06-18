// Define the base URL for your Flask API
const BASE_URL = 'http://127.0.0.1:5000'; 

// Get references to DOM elements for CUSTOMERS
const customerForm = document.getElementById('customer-form');
const customerListBody = document.getElementById('customer-list-body');
const customerMessageArea = document.getElementById('message-area'); 
const noCustomersMessage = document.getElementById('no-customers-message');
const updateCustomerModal = document.getElementById('update-customer-modal');
const closeCustomerModalButton = document.getElementById('close-customer-modal-button');
const cancelCustomerUpdateButton = document.getElementById('cancel-customer-update-button');
const updateCustomerForm = document.getElementById('update-customer-form');


// Function to display messages (success or error)
function showMessage(message, type = 'success') {
    customerMessageArea.textContent = message;
    customerMessageArea.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
    if (type === 'success') {
        customerMessageArea.classList.add('bg-green-100', 'text-green-800');
    } else {
        customerMessageArea.classList.add('bg-red-100', 'text-red-800');
    }
    customerMessageArea.classList.remove('hidden');
    setTimeout(() => {
        customerMessageArea.classList.add('hidden');
    }, 5000); 
}

// --- CUSTOMER MANAGEMENT FUNCTIONS ---

// Fungsi untuk mengambil dan menampilkan pelanggan
async function fetchCustomers() {
    console.log('Fetching customers from ' + BASE_URL + '/api/customers...');
    try {
        const response = await fetch(BASE_URL + '/api/customers');
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Network response was not ok (customers):', response.status, errorText);
            throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorText}`);
        }
        
        const customers = await response.json();
        console.log('Customers fetched:', customers);
        renderCustomers(customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        showMessage(`Failed to fetch customers: ${error.message}`, 'error');
        noCustomersMessage.classList.remove('hidden'); 
        customerListBody.innerHTML = ''; 
    }
}

// Fungsi untuk merender pelanggan dalam tabel
function renderCustomers(customers) {
    customerListBody.innerHTML = ''; 
    console.log('Rendering customers. Number of customers:', customers.length);

    if (!Array.isArray(customers) || customers.length === 0) {
        console.log('No customers to render or data is not an array.');
        noCustomersMessage.classList.remove('hidden'); 
        return;
    }
    noCustomersMessage.classList.add('hidden'); 

    customers.forEach(customer => {
        const row = customerListBody.insertRow();
        row.classList.add('hover:bg-gray-50', 'transition', 'duration-100', 'ease-in-out');
        // Mengakses properti berdasarkan struktur tabel yang baru
        const id_pelanggan = customer.id_pelanggan || '';
        const nama = customer.nama || ''; // Diperbarui dari nama_pelanggan
        const email = customer.email || ''; // Baru
        const alamat = customer.alamat || ''; // Baru
        const nomor_telepon = customer.nomor_telepon || ''; // Baru

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${id_pelanggan}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${nama}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${alamat}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${nomor_telepon}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="edit-customer-btn px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 mr-2 transition duration-150 ease-in-out shadow-sm" 
                    data-id="${id_pelanggan}" 
                    data-nama="${nama}" 
                    data-email="${email}" 
                    data-alamat="${alamat}" 
                    data-nomor-telepon="${nomor_telepon}">
                    Edit
                </button>
                <button class="delete-customer-btn px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-150 ease-in-out shadow-sm" data-id="${id_pelanggan}">
                    Delete
                </button>
            </td>
        `;
    });
}

// Event listener for adding a new customer
customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(customerForm);
    const customerData = Object.fromEntries(formData.entries());

    console.log('Adding new customer:', customerData);

    try {
        const response = await fetch(BASE_URL + '/api/customers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
        });

        const result = await response.json();
        console.log('Add customer response:', result);

        if (response.ok) {
            showMessage(result.message, 'success');
            customerForm.reset(); 
            fetchCustomers(); 
        } else {
            showMessage(result.error || 'Failed to add customer.', 'error');
        }
    } catch (error) {
        console.error('Error adding customer:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Event delegation for Customer Edit and Delete buttons
customerListBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-customer-btn')) {
        const id_pelanggan = e.target.dataset.id;
        const nama = e.target.dataset.nama;
        const email = e.target.dataset.email;
        const alamat = e.target.dataset.alamat;
        const nomor_telepon = e.target.dataset.nomorTelepon;

        document.getElementById('update_customer_id_pelanggan').value = id_pelanggan;
        document.getElementById('update_customer_nama').value = nama;
        document.getElementById('update_customer_email').value = email;
        document.getElementById('update_customer_alamat').value = alamat;
        document.getElementById('update_customer_nomor_telepon').value = nomor_telepon;

        updateCustomerModal.style.display = 'flex'; 
    } else if (e.target.classList.contains('delete-customer-btn')) {
        const id_pelanggan = e.target.dataset.id;
        const confirmationModal = document.createElement('div');
        confirmationModal.className = 'modal';
        confirmationModal.innerHTML = `
            <div class="modal-content">
                <h3 class="text-xl font-semibold mb-4 text-gray-800">Confirm Deletion</h3>
                <p class="mb-6 text-gray-700">Are you sure you want to delete customer with ID: <strong>${id_pelanggan}</strong>?</p>
                <div class="flex justify-end space-x-4">
                    <button id="confirm-delete-customer-yes" class="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 ease-in-out">Yes, Delete</button>
                    <button id="confirm-delete-customer-no" class="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200 ease-in-out">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmationModal);
        confirmationModal.style.display = 'flex';

        document.getElementById('confirm-delete-customer-yes').onclick = async () => {
            try {
                const response = await fetch(BASE_URL + `/api/customers/${id_pelanggan}`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                console.log('Delete customer response:', result);

                if (response.ok) {
                    showMessage(result.message, 'success');
                    fetchCustomers(); 
                } else {
                    showMessage(result.error || 'Failed to delete customer.', 'error');
                }
            } catch (error) {
                console.error('Error deleting customer:', error);
                showMessage(`Error: ${error.message}`, 'error');
            } finally {
                document.body.removeChild(confirmationModal); 
            }
        };

        document.getElementById('confirm-delete-customer-no').onclick = () => {
            document.body.removeChild(confirmationModal); 
        };

        confirmationModal.addEventListener('click', (event) => {
            if (event.target === confirmationModal) {
                document.body.removeChild(confirmationModal);
            }
        });
    }
});

// Event listener for updating a customer (modal form submission)
updateCustomerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id_pelanggan = document.getElementById('update_customer_id_pelanggan').value;
    const updatedData = {
        nama: document.getElementById('update_customer_nama').value,
        email: document.getElementById('update_customer_email').value,
        alamat: document.getElementById('update_customer_alamat').value,
        nomor_telepon: document.getElementById('update_customer_nomor_telepon').value
    };

    console.log('Updating customer:', id_pelanggan, updatedData);

    try {
        const response = await fetch(BASE_URL + `/api/customers/${id_pelanggan}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();
        console.log('Update customer response:', result);

        if (response.ok) {
            showMessage(result.message, 'success');
            updateCustomerModal.style.display = 'none'; 
            fetchCustomers(); 
        } else {
            showMessage(result.error || 'Failed to update customer.', 'error');
        }
    } catch (error) {
        console.error('Error updating customer:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Close customer modal when clicking on the close button or outside the modal
closeCustomerModalButton.addEventListener('click', () => {
    updateCustomerModal.style.display = 'none';
});

cancelCustomerUpdateButton.addEventListener('click', () => {
    updateCustomerModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    // Check if the click is outside the customer update modal content
    const customerModalContent = updateCustomerModal.querySelector('.modal-content');
    if (e.target === updateCustomerModal && e.target !== customerModalContent && !customerModalContent.contains(e.target)) {
        updateCustomerModal.style.display = 'none';
    }
});

// Initial fetch of customers when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchCustomers(); 
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
