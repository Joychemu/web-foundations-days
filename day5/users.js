
const loadButton = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const status = document.getElementById("status");
const usersList = document.getElementById("users-list");

const API_URL = "https://jsonplaceholder.typicode.com/users";

// Stores all users fetched from the API.
let users = [];

// Fetch users from the API.
async function loadUsers() {
    loadButton.disabled = true;
    status.textContent = "Loading users...";
    usersList.replaceChildren();

    try {
        const response = await fetch(API_URL);

        // Handle HTTP errors.
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        // Store the users for filtering without another request.
        users = data;

        renderUsers(getFilteredUsers());
        

        if (users.length === 0) {
            status.textContent = "No users found.";
        } else {
            status.textContent = `Successfully loaded ${users.length} users.`;
            renderUsers(getFilteredUsers());
        }

      
    } catch (error) {
        console.error("Error loading users:", error);

        users = [];
        usersList.replaceChildren();
        status.textContent =
            "Failed to load users. Please check your connection and try again.";
    } finally {
        // Always re-enable the button, whether successful or not.
        loadButton.disabled = false;
    }
}

// Return users whose names match the current filter.
function getFilteredUsers() {
    const searchText = filterInput.value.trim().toLowerCase();

    return users.filter(user =>
        user.name.toLowerCase().includes(searchText)
    );
}

// Display any supplied array of users.
function renderUsers(list) {
    usersList.replaceChildren();

    if (list.length === 0) {
        status.textContent = users.length === 0
            ? "No users found. Click Load Users to try again."
            : "No users match your filter.";
        return;
    }

    list.forEach(user => {
        const li = document.createElement("li");
        const name = document.createElement("h2");
        const email = document.createElement("p");
        const city = document.createElement("p");
        const company = document.createElement("p");

        name.textContent = user.name;
        email.textContent = `Email: ${user.email}`;
        city.textContent = `City: ${user.address.city}`;
        company.textContent = `Company: ${user.company.name}`;

        li.append(name, email, city, company);
        usersList.appendChild(li);
    });
}

// Load users when the button is clicked.
loadButton.addEventListener("click", loadUsers);

// Filter the stored users as the user types.
filterInput.addEventListener("input", () => {
    if (users.length === 0) {
        return;
    }

    const filteredUsers = getFilteredUsers();
    renderUsers(filteredUsers);
});
