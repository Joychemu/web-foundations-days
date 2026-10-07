// Select the required elements

const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");


// Update character and word counts

function updateCounts() {
    const text = noteText.value;

    // Count characters
    const characterCount = text.length;

    // Count words
    const trimmedText = text.trim();

    const numberOfWords = trimmedText === ""
        ? 0
        : trimmedText.split(/\s+/).length;

    // Update the counters
    charCount.textContent = `${characterCount} / 200 characters`;
    wordCount.textContent = `${numberOfWords} words`;

    // Reset counter classes
    charCount.classList.remove("warning", "over");

    // Add warning when character count is above 180
    if (characterCount > 180 && characterCount <= 200) {
        charCount.classList.add("warning");
    }

    // Add over class when character count is above 200
    if (characterCount > 200) {
        charCount.classList.add("over");
    }
}


// Save the note as a draft

function saveDraft() {
    localStorage.setItem("noteDraft", noteText.value);
}


// Clear the note and related data

function clearNote() {
    noteText.value = "";

    updateCounts();

    localStorage.removeItem("noteDraft");

    noteText.focus();
}


// Toggle between dark and light mode

function updateThemeButton() {
    if (document.body.classList.contains("dark")) {
        themeToggle.textContent = "Light mode";
    } else {
        themeToggle.textContent = "Dark mode";
    }
}


// Toggle theme

function toggleTheme() {
    document.body.classList.toggle("dark");

    const isDarkMode = document.body.classList.contains("dark");

    localStorage.setItem("theme", isDarkMode ? "dark" : "light");

    updateThemeButton();
}


// Handle every textarea input

noteText.addEventListener("input", function () {
    updateCounts();
    saveDraft();
});


// Clear button

clearBtn.addEventListener("click", function () {
    clearNote();
});


// Escape key clears the textarea

noteText.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        clearNote();
    }
});


// Theme button

themeToggle.addEventListener("click", function () {
    toggleTheme();
});


// Restore saved data when the page loads

const savedDraft = localStorage.getItem("noteDraft");

if (savedDraft !== null) {
    noteText.value = savedDraft;
}


// Restore saved theme

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark");
}


// Set the correct button label

updateThemeButton();


// Set the initial counters

updateCounts();