// Define the base URL for your Flask API
const BASE_URL = 'http://127.0.0.1:5000'; 

// Get references to DOM elements for EMPLOYEES
const employeeForm = document.getElementById('employee-form');
const employeeListBody = document.getElementById('employee-list-body');
const employeeMessageArea = document.getElementById('message-area'); 
const noEmployeesMessage = document.getElementById('no-employees-message');
const updateEmployeeModal = document.getElementById('update-employee-modal');
const closeEmployeeModalButton = document.getElementById('close-employee-modal-button');
const cancelEmployeeUpdateButton = document.getElementById('cancel-employee-update-button');
const updateEmployeeForm = document.getElementById('update-employee-form');


// Function to display messages (success or error)
function showMessage(message, type = 'success') {
    employeeMessageArea.textContent = message;
    employeeMessageArea.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
    if (type === 'success') {
        employeeMessageArea.classList.add('bg-green-100', 'text-green-800');
    } else {
        employeeMessageArea.classList.add('bg-red-100', 'text-red-800');
    }
    employeeMessageArea.classList.remove('hidden');
    setTimeout(() => {
        employeeMessageArea.classList.add('hidden');
    }, 5000); 
}

// --- EMPLOYEE MANAGEMENT FUNCTIONS ---

// Fungsi untuk mengambil dan menampilkan karyawan
async function fetchEmployees() {
    console.log('Fetching employees from ' + BASE_URL + '/api/employees...');
    try {
        const response = await fetch(BASE_URL + '/api/employees');
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Network response was not ok (employees):', response.status, errorText);
            throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorText}`);
        }
        
        const employees = await response.json();
        console.log('Employees fetched:', employees);
        renderEmployees(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        showMessage(`Failed to fetch employees: ${error.message}`, 'error');
        noEmployeesMessage.classList.remove('hidden'); 
        employeeListBody.innerHTML = ''; 
    }
}

// Fungsi untuk merender karyawan dalam tabel
function renderEmployees(employees) {
    employeeListBody.innerHTML = ''; 
    console.log('Rendering employees. Number of employees:', employees.length);

    if (!Array.isArray(employees) || employees.length === 0) {
        console.log('No employees to render or data is not an array.');
        noEmployeesMessage.classList.remove('hidden'); 
        return;
    }
    noEmployeesMessage.classList.add('hidden'); 

    employees.forEach(employee => {
        const row = employeeListBody.insertRow();
        row.classList.add('hover:bg-gray-50', 'transition', 'duration-100', 'ease-in-out');
        const id_karyawan = employee.id_karyawan || '';
        const nama_karyawan = employee.nama_karyawan || '';
        const jabatan = employee.jabatan || '';
        const nomor_telepon = employee.nomor_telepon || ''; // Diperbarui dari 'departemen'

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${id_karyawan}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${nama_karyawan}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${jabatan}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${nomor_telepon}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="edit-employee-btn px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 mr-2 transition duration-150 ease-in-out shadow-sm" 
                    data-id="${id_karyawan}" 
                    data-nama="${nama_karyawan}" 
                    data-jabatan="${jabatan}" 
                    data-nomor-telepon="${nomor_telepon}">
                    Edit
                </button>
                <button class="delete-employee-btn px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-150 ease-in-out shadow-sm" data-id="${id_karyawan}">
                    Delete
                </button>
            </td>
        `;
    });
}

// Event listener for adding a new employee
employeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(employeeForm);
    const employeeData = Object.fromEntries(formData.entries());

    console.log('Adding new employee:', employeeData);

    try {
        const response = await fetch(BASE_URL + '/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });

        const result = await response.json();
        console.log('Add employee response:', result);

        if (response.ok) {
            showMessage(result.message, 'success');
            employeeForm.reset(); 
            fetchEmployees(); 
        } else {
            showMessage(result.error || 'Failed to add employee.', 'error');
        }
    } catch (error) {
        console.error('Error adding employee:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Event delegation for Employee Edit and Delete buttons
employeeListBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-employee-btn')) {
        const id_karyawan = e.target.dataset.id;
        const nama_karyawan = e.target.dataset.nama;
        const jabatan = e.target.dataset.jabatan;
        const nomor_telepon = e.target.dataset.nomorTelepon; // Diperbarui

        document.getElementById('update_employee_id_karyawan').value = id_karyawan;
        document.getElementById('update_employee_nama_karyawan').value = nama_karyawan;
        document.getElementById('update_employee_jabatan').value = jabatan;
        document.getElementById('update_employee_nomor_telepon').value = nomor_telepon; // Diperbarui

        updateEmployeeModal.style.display = 'flex'; 
    } else if (e.target.classList.contains('delete-employee-btn')) {
        const id_karyawan = e.target.dataset.id;
        const confirmationModal = document.createElement('div');
        confirmationModal.className = 'modal';
        confirmationModal.innerHTML = `
            <div class="modal-content">
                <h3 class="text-xl font-semibold mb-4 text-gray-800">Confirm Deletion</h3>
                <p class="mb-6 text-gray-700">Are you sure you want to delete employee with ID: <strong>${id_karyawan}</strong>?</p>
                <div class="flex justify-end space-x-4">
                    <button id="confirm-delete-employee-yes" class="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 ease-in-out">Yes, Delete</button>
                    <button id="confirm-delete-employee-no" class="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200 ease-in-out">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmationModal);
        confirmationModal.style.display = 'flex';

        document.getElementById('confirm-delete-employee-yes').onclick = async () => {
            try {
                const response = await fetch(BASE_URL + `/api/employees/${id_karyawan}`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                console.log('Delete employee response:', result);

                if (response.ok) {
                    showMessage(result.message, 'success');
                    fetchEmployees(); 
                } else {
                    showMessage(result.error || 'Failed to delete employee.', 'error');
                }
            } catch (error) {
                console.error('Error deleting employee:', error);
                showMessage(`Error: ${error.message}`, 'error');
            } finally {
                document.body.removeChild(confirmationModal); 
            }
        };

        document.getElementById('confirm-delete-employee-no').onclick = () => {
            document.body.removeChild(confirmationModal); 
        };

        confirmationModal.addEventListener('click', (event) => {
            if (event.target === confirmationModal) {
                document.body.removeChild(confirmationModal);
            }
        });
    }
});

// Event listener for updating an employee (modal form submission)
updateEmployeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id_karyawan = document.getElementById('update_employee_id_karyawan').value;
    const updatedData = {
        nama_karyawan: document.getElementById('update_employee_nama_karyawan').value,
        jabatan: document.getElementById('update_employee_jabatan').value,
        nomor_telepon: document.getElementById('update_employee_nomor_telepon').value // Diperbarui
    };

    console.log('Updating employee:', id_karyawan, updatedData);

    try {
        const response = await fetch(BASE_URL + `/api/employees/${id_karyawan}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();
        console.log('Update employee response:', result);

        if (response.ok) {
            showMessage(result.message, 'success');
            updateEmployeeModal.style.display = 'none'; 
            fetchEmployees(); 
        } else {
            showMessage(result.error || 'Failed to update employee.', 'error');
        }
    } catch (error) {
        console.error('Error updating employee:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Close employee modal when clicking on the close button or outside the modal
closeEmployeeModalButton.addEventListener('click', () => {
    updateEmployeeModal.style.display = 'none';
});

cancelEmployeeUpdateButton.addEventListener('click', () => {
    updateEmployeeModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    // Check if the click is outside the employee update modal content
    const employeeModalContent = updateEmployeeModal.querySelector('.modal-content');
    if (e.target === updateEmployeeModal && e.target !== employeeModalContent && !employeeModalContent.contains(e.target)) {
        updateEmployeeModal.style.display = 'none';
    }
});

// Initial fetch of employees when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchEmployees(); 
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