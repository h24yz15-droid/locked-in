const STORAGE_KEY = "currentWorkflow";

const form = document.getElementById("workflow-form");
const input = document.getElementById("workflow-input");
const saveButton = document.getElementById("save-button");
const confirmation = document.getElementById("confirmation");

let confirmationTimeoutId = null;

function loadWorkflow() {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (result[STORAGE_KEY]) {
      input.value = result[STORAGE_KEY];
    }
  });
}

function showConfirmation() {
  confirmation.hidden = false;
  if (confirmationTimeoutId) {
    clearTimeout(confirmationTimeoutId);
  }
  confirmationTimeoutId = setTimeout(() => {
    confirmation.hidden = true;
  }, 2000);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const workflow = input.value.trim();
  saveButton.disabled = true;

  chrome.storage.local.set({ [STORAGE_KEY]: workflow }, () => {
    saveButton.disabled = false;
    showConfirmation();
  });
});

loadWorkflow();