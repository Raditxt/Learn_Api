// Define the base URL for your Flask API
const BASE_URL = 'http://127.0.0.1:5000'; 

// Get references to DOM elements for PRODUCTS
const productForm = document.getElementById('product-form');
const productListBody = document.getElementById('product-list-body');
const productMessageArea = document.getElementById('message-area'); 
const noProductsMessage = document.getElementById('no-products-message');
const updateProductModal = document.getElementById('update-modal');
const closeProductModalButton = document.getElementById('close-modal-button');
const cancelProductUpdateButton = document.getElementById('cancel-update-button');
const updateProductForm = document.getElementById('update-product-form');

// Function to display messages (success or error)
function showMessage(message, type = 'success') {
    productMessageArea.textContent = message;
    productMessageArea.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
    if (type === 'success') {
        productMessageArea.classList.add('bg-green-100', 'text-green-800');
    } else {
        productMessageArea.classList.add('bg-red-100', 'text-red-800');
    }
    productMessageArea.classList.remove('hidden');
    setTimeout(() => {
        productMessageArea.classList.add('hidden');
    }, 5000); 
}

// --- Fungsi untuk mengambil dan menampilkan produk ---
async function fetchProducts() {
    console.log('Fetching products from ' + BASE_URL + '/api/products...');
    try {
        const response = await fetch(BASE_URL + '/api/products');
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Network response was not ok:', response.status, errorText);
            throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorText}`);
        }
        
        const products = await response.json();
        console.log('Products fetched:', products);
        renderProducts(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        showMessage(`Failed to fetch products: ${error.message}`, 'error');
        noProductsMessage.classList.remove('hidden'); 
        productListBody.innerHTML = ''; 
    }
}

// --- Fungsi untuk merender produk dalam tabel ---
function renderProducts(products) {
    productListBody.innerHTML = ''; 
    console.log('Rendering products. Number of products:', products.length);

    if (!Array.isArray(products) || products.length === 0) {
        console.log('No products to render or data is not an array.');
        noProductsMessage.classList.remove('hidden'); 
        return;
    }
    noProductsMessage.classList.add('hidden'); 

    products.forEach(product => {
        const row = productListBody.insertRow();
        row.classList.add('hover:bg-gray-50', 'transition', 'duration-100', 'ease-in-out');
        const id_produk = product.id_produk || '';
        const nama_produk = product.nama_produk || '';
        const brand = product.brand || '';
        const id_sub_kategori = product.id_sub_kategori || '';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${id_produk}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${nama_produk}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${brand}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${id_sub_kategori}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="edit-btn px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 mr-2 transition duration-150 ease-in-out shadow-sm" 
                    data-id="${id_produk}" 
                    data-nama="${nama_produk}" 
                    data-brand="${brand}" 
                    data-subkategori="${id_sub_kategori}">
                    Edit
                </button>
                <button class="delete-btn px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-150 ease-in-out shadow-sm" data-id="${id_produk}">
                    Delete
                </button>
            </td>
        `;
    });
}

// Event listener for adding a new product
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(productForm);
    const productData = Object.fromEntries(formData.entries());

    console.log('Adding new product:', productData);

    try {
        const response = await fetch(BASE_URL + '/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });

        const result = await response.json();
        console.log('Add product response:', result);

        if (response.ok) {
            showMessage(result.message, 'success');
            productForm.reset(); 
            fetchProducts(); 
        } else {
            showMessage(result.error || 'Failed to add product.', 'error');
        }
    } catch (error) {
        console.error('Error adding product:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Event delegation for Product Edit and Delete buttons
productListBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-btn')) {
        const id_produk = e.target.dataset.id;
        const nama_produk = e.target.dataset.nama;
        const brand = e.target.dataset.brand;
        const id_sub_kategori = e.target.dataset.subkategori;

        document.getElementById('update_id_produk').value = id_produk;
        document.getElementById('update_nama_produk').value = nama_produk;
        document.getElementById('update_brand').value = brand;
        document.getElementById('update_id_sub_kategori').value = id_sub_kategori;

        updateProductModal.style.display = 'flex'; 
    } else if (e.target.classList.contains('delete-btn')) {
        const id_produk = e.target.dataset.id;
        const confirmationModal = document.createElement('div');
        confirmationModal.className = 'modal';
        confirmationModal.innerHTML = `
            <div class="modal-content">
                <h3 class="text-xl font-semibold mb-4 text-gray-800">Confirm Deletion</h3>
                <p class="mb-6 text-gray-700">Are you sure you want to delete product with ID: <strong>${id_produk}</strong>?</p>
                <div class="flex justify-end space-x-4">
                    <button id="confirm-delete-yes" class="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 ease-in-out">Yes, Delete</button>
                    <button id="confirm-delete-no" class="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200 ease-in-out">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmationModal);
        confirmationModal.style.display = 'flex';

        document.getElementById('confirm-delete-yes').onclick = async () => {
            try {
                const response = await fetch(BASE_URL + `/api/products/${id_produk}`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                console.log('Delete product response:', result);

                if (response.ok) {
                    showMessage(result.message, 'success');
                    fetchProducts(); 
                } else {
                    showMessage(result.error || 'Failed to delete product.', 'error');
                }
            } catch (error) {
                console.error('Error deleting product:', error);
                showMessage(`Error: ${error.message}`, 'error');
            } finally {
                document.body.removeChild(confirmationModal); 
            }
        };

        document.getElementById('confirm-delete-no').onclick = () => {
            document.body.removeChild(confirmationModal); 
        };

        confirmationModal.addEventListener('click', (event) => {
            if (event.target === confirmationModal) {
                document.body.removeChild(confirmationModal);
            }
        });
    }
});

// Event listener for updating a product (modal form submission)
updateProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id_produk = document.getElementById('update_id_produk').value;
    const updatedData = {
        nama_produk: document.getElementById('update_nama_produk').value,
        brand: document.getElementById('update_brand').value,
        id_sub_kategori: document.getElementById('update_id_sub_kategori').value
    };

    console.log('Updating product:', id_produk, updatedData);

    try {
        const response = await fetch(BASE_URL + `/api/products/${id_produk}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();
        console.log('Update product response:', result);

        if (response.ok) {
            showMessage(result.message, 'success');
            updateProductModal.style.display = 'none'; 
            fetchProducts(); 
        } else {
            showMessage(result.error || 'Failed to update product.', 'error');
        }
    } catch (error) {
        console.error('Error updating product:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Close product modal when clicking on the close button or outside the modal
closeProductModalButton.addEventListener('click', () => {
    updateProductModal.style.display = 'none';
});

cancelProductUpdateButton.addEventListener('click', () => {
    updateProductModal.style.display = 'none';
});

function searchProducts() {
    const id_produk = document.getElementById('search_id_produk').value.trim();
    const nama_produk = document.getElementById('search_nama_produk').value.trim();
    const brand = document.getElementById('search_brand').value.trim();
    const id_sub_kategori = document.getElementById('search_id_sub_kategori').value.trim();

    let url = '/api/products?';
    if (id_produk) url += `id_produk=${encodeURIComponent(id_produk)}&`;
    if (nama_produk) url += `nama_produk=${encodeURIComponent(nama_produk)}&`;
    if (brand) url += `brand=${encodeURIComponent(brand)}&`;
    if (id_sub_kategori) url += `id_sub_kategori=${encodeURIComponent(id_sub_kategori)}&`;

    console.log('Fetching with query:', url);

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch products.");
            return response.json();
        })
        .then(data => renderProducts(data))
        .catch(error => {
            console.error('Search failed:', error);
            productListBody.innerHTML = '';
            noProductsMessage.classList.remove('hidden');
        });
}



window.addEventListener('click', (e) => {
    // Check if the click is outside the product update modal content
    const productModalContent = updateProductModal.querySelector('.modal-content');
    if (e.target === updateProductModal && e.target !== productModalContent && !productModalContent.contains(e.target)) {
        updateProductModal.style.display = 'none';
    }
});


// Initial fetch of products when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
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