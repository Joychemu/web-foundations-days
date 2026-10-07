// Starting notes data

let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" }
];


// 1. searchNotes()
// Returns notes whose text contains the search word,
// ignoring upper and lower case.

function searchNotes(word) {
    const searchWord = word.toLowerCase();

    return notes.filter(function (note) {
        return note.text.toLowerCase().includes(searchWord);
    });
}


// Test searchNotes()
console.log(searchNotes("assignment"));
// Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]

console.log(searchNotes("javascript"));
// Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]

console.log(searchNotes("football"));
// Expected: []

console.log(searchNotes("MUM"));
// Expected: [{ id: 5, text: "Call mum", category: "personal" }]


// 2. longestNote()
// Returns the note with the most characters.
// Returns null when there are no notes.

function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    let longest = notes[0];

    for (let i = 1; i < notes.length; i++) {
        if (notes[i].text.length > longest.text.length) {
            longest = notes[i];
        }
    }

    return longest;
}


// Test longestNote()
console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

let savedNotes = notes;
notes = [];

console.log(longestNote());
// Expected: null

notes = savedNotes;


// 3. countByCategory()
// Returns an object containing the number of notes
// in each category.

function countByCategory() {
    const counts = {};

    for (const note of notes) {
        if (counts[note.category]) {
            counts[note.category]++;
        } else {
            counts[note.category] = 1;
        }
    }

    return counts;
}


// Test countByCategory()
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

notes = [];

console.log(countByCategory());
// Expected: {}

notes = savedNotes;


// 4. getSummary()
// Returns a sentence summarising the number of notes
// in each category.

function getSummary() {
    const counts = countByCategory();
    const total = notes.length;

    const noteWord = total === 1 ? "note" : "notes";

    return `${total} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}


// Test getSummary()
console.log(getSummary());
// Expected: 5 notes: 2 personal, 1 work, 2 study.

notes = [{ id: 6, text: "Study JavaScript", category: "study" }];

console.log(getSummary());
// Expected: 1 note: 0 personal, 0 work, 1 study.

notes = savedNotes;


// 5. isDuplicate()
// Returns true if a note with the same text already exists.
// Comparison ignores case and extra spaces.

function isDuplicate(text) {
    const cleanedText = text.trim().toLowerCase();

    return notes.some(function (note) {
        return note.text.trim().toLowerCase() === cleanedText;
    });
}


// Test isDuplicate()
console.log(isDuplicate("Buy milk and bread"));
// Expected: true

console.log(isDuplicate("  BUY MILK AND BREAD  "));
// Expected: true

console.log(isDuplicate("Buy eggs"));
// Expected: false

console.log(isDuplicate("  Call my friend  "));
// Expected: false


// 6. addNote()
// Adds a note only when:
// - Text is between 1 and 200 characters
// - The note is not a duplicate
// - Category is personal, work or study
//
// Returns true when added and false otherwise.

function addNote(text, category) {
    const cleanedText = text.trim();

    if (cleanedText.length < 1 || cleanedText.length > 200) {
        console.log("Note was not added: text must be between 1 and 200 characters.");
        return false;
    }

    if (isDuplicate(cleanedText)) {
        console.log("Note was not added: duplicate note.");
        return false;
    }

    const validCategories = ["personal", "work", "study"];

    if (!validCategories.includes(category)) {
        console.log("Note was not added: invalid category.");
        return false;
    }

    const newId = notes.length > 0
        ? Math.max(...notes.map(note => note.id)) + 1
        : 1;

    notes.push({
        id: newId,
        text: cleanedText,
        category: category
    });

    console.log("Note added successfully.");

    return true;
}


// Test addNote() - normal case
console.log(addNote("Prepare presentation slides", "work"));
// Expected: true

// Test addNote() - duplicate
console.log(addNote("  PREPARE PRESENTATION SLIDES  ", "work"));
// Expected: false

// Test addNote() - invalid category
console.log(addNote("Go for a walk", "health"));
// Expected: false

// Test addNote() - empty text
console.log(addNote("   ", "personal"));
// Expected: false

// Test addNote() - text longer than 200 characters
console.log(addNote(
    "This is a very long note that is intentionally written to contain more than two hundred characters so that we can test the validation requirement of the addNote function and confirm that excessively long notes are rejected by the application.",
    "personal"
));
// Expected: false


// Display final notes
console.log(notes);
// Expected: Original 5 notes plus "Prepare presentation slides" as a new work note.