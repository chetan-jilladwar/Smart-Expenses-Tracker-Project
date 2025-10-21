//
// =========================================================================
//  IMPORTANT: Paste your Google Apps Script Web App URL here.
// =========================================================================
//
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwWFC7M0DXHUtt3K6Bh2WFiVphCogm23DpiaGMZWUV2LtHzcTar6AO490ieyVpFMizONg/exec'; 

// Budgeting Constant (Updated with a realistic Rupee value)
const MONTHLY_BUDGET = 25000.00; // <-- Define your monthly budget here

// DOM elements
const loader = document.getElementById('loader');
const appContent = document.getElementById('app-content');
const form = document.getElementById('expense-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const transactionList = document.getElementById('transaction-list');
const totalSpentEl = document.getElementById('total-spent');
const transactionCountEl = document.getElementById('transaction-count');
const categoryChartCanvas = document.getElementById('category-chart').getContext('2d');

let categoryChart;

// --- Main App Logic ---

// Fetches all expenses from the Google Sheet backend
async function fetchExpenses() {
    showLoader();
    try {
        const response = await fetch(WEB_APP_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        
        if (result.success) {
            renderAll(result.data);
        } else {
            alert('Failed to fetch expenses.');
        }
    } catch (error) {
        console.error('Error fetching expenses:', error);
        alert('An error occurred while fetching data. Check the console.');
    } finally {
        hideLoader();
    }
}

// Renders all components: list, dashboard, and chart
function renderAll(expenses) {
    // Sort expenses by timestamp, newest first
    expenses.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    
    renderTransactionList(expenses);
    updateDashboard(expenses);
    renderCategoryChart(expenses);
}

// Renders the list of transactions (₹ symbol used)
function renderTransactionList(expenses) {
    transactionList.innerHTML = ''; 
    if (expenses.length === 0) {
        transactionList.innerHTML = '<li>No transactions yet.</li>';
        return;
    }
    expenses.forEach(expense => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>
                <strong>${expense.Description}</strong>
                <span class="category">${expense.Category}</span>
            </span>
            <span>₹${parseFloat(expense.Amount).toFixed(2)}</span>
            <button class="delete-btn" onclick="deleteExpense('${expense.ID}')">X</button>
        `;
        transactionList.appendChild(li);
    });
}

// Updates the dashboard cards, including Budgeting logic (₹ symbol used)
function updateDashboard(expenses) {
    const totalSpent = expenses.reduce((sum, exp) => sum + parseFloat(exp.Amount), 0);
    
    // --- Budget Calculation ---
    const budgetLeft = MONTHLY_BUDGET - totalSpent;
    const percentUsed = (totalSpent / MONTHLY_BUDGET) * 100;
    
    // --- DOM Updates ---
    totalSpentEl.textContent = `₹${totalSpent.toFixed(2)}`;
    transactionCountEl.textContent = expenses.length;
    
    document.getElementById('budget-left').textContent = `₹${budgetLeft.toFixed(2)}`;
    document.getElementById('budget-info').textContent = 
        `${percentUsed.toFixed(1)}% of ₹${MONTHLY_BUDGET.toFixed(2)} used`;
    
    const progressBar = document.getElementById('budget-progress');
    progressBar.style.width = `${Math.min(percentUsed, 100)}%`;
    
    // Change color if budget is exceeded
    if (budgetLeft < 0) {
        progressBar.style.backgroundColor = '#e74c3c'; 
        document.getElementById('budget-left').style.color = '#e74c3c';
    } else {
        progressBar.style.backgroundColor = '#4a90e2'; 
        document.getElementById('budget-left').style.color = '#388e3c';
    }
}

// Renders or updates the category pie chart
function renderCategoryChart(expenses) {
    const categoryData = expenses.reduce((acc, exp) => {
        acc[exp.Category] = (acc[exp.Category] || 0) + parseFloat(exp.Amount);
        return acc;
    }, {});

    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);

    if (categoryChart) {
        categoryChart.destroy(); 
    }

    categoryChart = new Chart(categoryChartCanvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Spending by Category',
                data: data,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        }
    });
}

// Handles the form submission to add a new expense (CORS fix applied)
async function handleAddExpense(e) {
    e.preventDefault();

    const newExpense = {
        description: descriptionInput.value,
        amount: parseFloat(amountInput.value),
        category: categoryInput.value
    };

    showLoader();
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ // Headers property is omitted for CORS fix
                action: 'addExpense',
                data: newExpense
            }),
        });
        
        const result = await response.json();
        
        if (result.success) {
            form.reset();
            fetchExpenses(); 
        } else {
            alert('Failed to add expense: ' + result.message);
        }
    } catch (error) {
        console.error('Error adding expense:', error);
        alert('An error occurred while adding the expense.');
    } finally {
        hideLoader();
    }
}

// Deletes an expense by its ID (CORS fix applied)
async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    showLoader();
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ // Headers property is omitted for CORS fix
                action: 'deleteExpense',
                data: { id: id }
            }),
        });
        
        const result = await response.json();
        
        if (result.success) {
            fetchExpenses(); 
        } else {
            alert('Failed to delete expense: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        alert('An error occurred while deleting the expense.');
    } finally {
        hideLoader();
    }
}


// --- Utility Functions ---

function showLoader() {
    loader.style.display = 'block';
    appContent.classList.add('hidden');
}

function hideLoader() {
    loader.style.display = 'none';
    appContent.classList.remove('hidden');
}


// --- Event Listeners ---

// Add submit event listener to the form
form.addEventListener('submit', handleAddExpense);

// Initial fetch of data when the page loads
document.addEventListener('DOMContentLoaded', fetchExpenses);