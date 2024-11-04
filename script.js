document.addEventListener('DOMContentLoaded', () => {
    const productsContainer = document.getElementById('productsContainer');
    const messageDiv = document.getElementById('message');

    // Function to fetch product data for autocomplete
    const fetchProducts = async (searchTerm) => {
        try {
            const response = await fetch(`/api/products?term=${searchTerm}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.map(product => product.Name);
        } catch (error) {
            console.error('Error fetching products:', error);
            messageDiv.textContent = 'Error loading product suggestions.';
            return [];
        }
    };

    // Create 25 product input fields with quantity fields and autocomplete
    for (let i = 0; i < 25; i++) {
        const productInput = document.createElement('input');
        productInput.type = 'text';
        productInput.classList.add('productInput');
        productInput.id = `product${i}`;
        productInput.placeholder = 'Search products...';

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.classList.add('quantityInput');
        quantityInput.id = `quantity${i}`;
        quantityInput.placeholder = 'Quantity';
        quantityInput.min = '0';

        productsContainer.appendChild(productInput);
        productsContainer.appendChild(quantityInput);
        productsContainer.appendChild(document.createElement('br'));
        productsContainer.appendChild(document.createElement('br'));

        // Add autocomplete functionality
        productInput.addEventListener('input', async () => {
            const searchTerm = productInput.value;
            const products = await fetchProducts(searchTerm);

            const dataList = document.createElement('datalist');
            dataList.id = `productList${i}`;

            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product;
                dataList.appendChild(option);
            });

            productInput.setAttribute('list', `productList${i}`);
            productInput.appendChild(dataList);
        });
    }

    const formId = window.location.pathname.includes('receive.html') ? 'receiveInventoryForm' : 'transferForm';
    const form = document.getElementById(formId);

    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();

            const products = [];
            const productInputs = document.querySelectorAll('.productInput');
            productInputs.forEach((productInput, index) => {
                const productName = productInput.value;
                const quantity = document.getElementById(`quantity${index}`).value;
                if (productName && quantity) {
                    products.push({ productName, quantity });
                }
            });

            const apiEndpoint = formId === 'receiveInventoryForm' ? '/api/receive-inventory' : '/api/submit-transfer';

            // For transfer form
            let transferData = {};
            if (formId === 'transferForm') {
                transferData = {
                    invoiceOrderDate: document.getElementById('invoiceOrderDate').value,
                    invoiceReceivedDate: document.getElementById('invoiceReceivedDate').value,
                    invoiceNumber: document.getElementById('invoiceNumber').value,
                    toLocationId: document.getElementById('locationId').value
                };
            }

            const requestData = formId === 'receiveInventoryForm' ? { products } : { ...transferData, products };
            
            console.log(requestData);

            fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                return response.json().then(data => ({
                    status: response.status,
                    ok: response.ok,
                    body: data
                }));
            })
            .then(({ status, ok, body }) => {
                messageDiv.textContent = body.message;
                if (ok) {
                    document.getElementById(formId).reset();
                    setTimeout(() => {
                        window.location.href = 'http://localhost:8000/';
                    }, 2000);
                } else {
                    messageDiv.textContent = body.message || 'An error occurred.';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                messageDiv.textContent = 'An error occurred.';
            });
        });
    }
});      