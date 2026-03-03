document.addEventListener("DOMContentLoaded", () => {
  // Get references to the HTML elements we'll be working with
  const sectionDropdown = document.getElementById("section-dropdown");
  const searchInput = document.getElementById("search-input");
  const currentSectionEl = document.getElementById("current-section");
  const studentListEl = document.getElementById("student-list");
  const whatsappShareBtn = document.getElementById("whatsapp-share");
  const selectAllCheckbox = document.getElementById("select-all-checkbox");

  // State variables
  let studentData = {}; // All students, grouped by section
  let allStudentsMap = new Map(); // Map of rollNumber -> student object for easy lookup
  let currentSection = null;
  let selectedStudents = new Set(); // A set of rollNumbers for selected students

  // --- Data Processing ---
  function processData(rawData) {
    const groupedData = rawData.reduce((acc, student) => {
      const section = student.SectionName;
      if (!acc[section]) {
        acc[section] = []; // Create an array for the section if it doesn't exist
      }
      const studentInfo = {
        rollNumber: student.SRN,
        name: student.Name,
      };
      acc[section].push(studentInfo);
      allStudentsMap.set(studentInfo.rollNumber, studentInfo); // Populate the map
      return acc;
    }, {});

    for (const section in groupedData) {
      groupedData[section].sort((a, b) => a.name.localeCompare(b.name));
    }
    return groupedData;
  }

  // --- UI Rendering ---
  function renderStudents(studentsToDisplay) {
    studentListEl.innerHTML = "";
    studentsToDisplay.forEach((student) => {
      const row = studentListEl.insertRow();
      const selectCell = row.insertCell(0);
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "student-checkbox";
      checkbox.dataset.rollNumber = student.rollNumber;
      // Restore checked state for this student if they are in the selected set
      checkbox.checked = selectedStudents.has(student.rollNumber);
      selectCell.appendChild(checkbox);

      row.insertCell(1).textContent = student.rollNumber;
      row.insertCell(2).textContent = student.name;
    });
    updateWhatsAppLink(); // Update button and select-all state
  }

  function updateWhatsAppLink() {
    if (selectedStudents.size === 0) {
      whatsappShareBtn.style.display = "none";
    } else {
      let whatsAppMessage = `*Selected Students - Section ${currentSection}*\n\n`;
      selectedStudents.forEach((rollNumber) => {
        const student = allStudentsMap.get(rollNumber);
        if (student) {
          whatsAppMessage += `${student.rollNumber} - ${student.name}\n`;
        }
      });
      const encodedMessage = encodeURIComponent(whatsAppMessage);
      whatsappShareBtn.href = `https://wa.me/?text=${encodedMessage}`;
      whatsappShareBtn.style.display = "inline-block";
    }

    // Update the 'select all' checkbox state
    const visibleCheckboxes = document.querySelectorAll(".student-checkbox");
    const allVisibleSelected =
      visibleCheckboxes.length > 0 &&
      Array.from(visibleCheckboxes).every((box) => box.checked);

    selectAllCheckbox.checked = allVisibleSelected;
    selectAllCheckbox.indeterminate =
      !allVisibleSelected &&
      Array.from(visibleCheckboxes).some((box) => box.checked);
  }

  // --- Event Handlers ---
  function handleSearch() {
    if (!currentSection) return;
    const searchTerm = searchInput.value.toLowerCase();
    const students = studentData[currentSection];
    const filteredStudents = students.filter(
      (student) =>
        student.name.toLowerCase().includes(searchTerm) ||
        student.rollNumber.toLowerCase().includes(searchTerm),
    );
    renderStudents(filteredStudents);
  }

  function handleSectionChange() {
    currentSection = sectionDropdown.value;
    selectedStudents.clear(); // Clear selections when changing section
    searchInput.value = ""; // Clear search input

    if (!currentSection) {
      currentSectionEl.textContent = "";
      studentListEl.innerHTML = "";
      searchInput.disabled = true;
      updateWhatsAppLink();
      return;
    }

    searchInput.disabled = false;
    currentSectionEl.textContent = `Section: ${currentSection}`;
    renderStudents(studentData[currentSection]);
  }

  // --- Initial Load ---
  fetch("students.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((rawData) => {
      studentData = processData(rawData);

      // Populate dropdown
      const sections = Object.keys(studentData).sort().reverse();
      sections.forEach((section) => {
        const option = document.createElement("option");
        option.value = section;
        option.textContent = section;
        sectionDropdown.appendChild(option);
      });

      // Initially disable search until a section is selected
      searchInput.disabled = true;

      // --- Event Listeners Setup ---
      sectionDropdown.addEventListener("change", handleSectionChange);
      searchInput.addEventListener("input", handleSearch);

      selectAllCheckbox.addEventListener("change", () => {
        const visibleCheckboxes =
          document.querySelectorAll(".student-checkbox");
        visibleCheckboxes.forEach((box) => {
          box.checked = selectAllCheckbox.checked;
          const rollNumber = box.dataset.rollNumber;
          if (selectAllCheckbox.checked) {
            selectedStudents.add(rollNumber);
          } else {
            selectedStudents.delete(rollNumber);
          }
        });
        updateWhatsAppLink();
      });

      studentListEl.addEventListener("change", (event) => {
        if (event.target.matches(".student-checkbox")) {
          const rollNumber = event.target.dataset.rollNumber;
          if (event.target.checked) {
            selectedStudents.add(rollNumber);
          } else {
            selectedStudents.delete(rollNumber);
          }
          updateWhatsAppLink();
        }
      });
    })
    .catch((error) => {
      console.error("Error loading or processing student data:", error);
      currentSectionEl.textContent =
        "Failed to load student data. Please check the console.";
    });
});
