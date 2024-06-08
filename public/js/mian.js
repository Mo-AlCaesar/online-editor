$(function () {
  // Assuming you're using jQuery UI for tabs
  $("#tabs").tabs();
  // Function to change editor theme
  function changeEditorTheme(themeName) {
    monaco.editor.setTheme(themeName);
  }

  var completionProviderRegistered = false;

  function initializeMonacoEditor(tabNum) {
    // Initialize Monaco Editor
    require.config({
      paths: {
        vs: "public/monaco-editor/min/vs",
      },
    });

    require(["vs/editor/editor.main"], function () {
      var editor = monaco.editor.create(document.getElementById(tabNum), {
        value: "",
        language: "html",
        automaticLayout: true,
        minimap: {
          enabled: false, // Disable minimap
        },
        // Enable IntelliSense
        suggest: {
          showIcons: true, // Enable icons in suggestions
          snippetsPreventQuickSuggestions: false, // Allow quick suggestions when typing a snippet prefix
          quickSuggestions: true, // Enable quick suggestions
        },
      });

      // Register completion provider only once
      if (!completionProviderRegistered) {
        monaco.languages.registerCompletionItemProvider("html", {
          provideCompletionItems: async function (model, position) {
            const suggestions = await fetchSuggestionsFromLocalFile();
            return { suggestions };
          },
        });
        completionProviderRegistered = true;
      }
    });
  }

  async function fetchSuggestionsFromLocalFile() {
    try {
      // Fetch suggestions from local file
      const response = await fetch("api/suggestions.json");
      const data = await response.json();

      // Process data and return suggestions
      const suggestions = data.map((item) => ({
        label: item.label,
        kind: monaco.languages.CompletionItemKind[item.kind], // Convert kind string to enum value
        insertText: item.insertText, // Optional: include insert text for snippets
      }));

      return suggestions;
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      return [];
    }
  }

  initializeMonacoEditor("codeInput");
  // //////////////////////////////////

  $("#newTabButton").on("click", function () {
    var numTabs = $("#tabs ul li").length - 1 + 1;
    var tabName = "Untitled-" + numTabs;
    var tabId = "tabs-" + numTabs;

    var tabTemplate = `<li><a href="#${tabId}">${tabName}</a> <span class="ui-icon ui-icon-close" role="presentation">Remove Tab</span></li>`;
    var tabContent = `         
    <div id="${tabId}" class="tab-content">
      <div class="row">
        <div class="col-md-6 container-full">
          <div class="mb-3">
            <div id="codeInput-${numTabs}" class="codeInput" style="height: 300px;"></div>
          </div>
        </div>
        <div class="col-md-6 container-full">
          <iframe id="resultFrame-${numTabs}" class="resultFrame border" style="width: 100%; height: 100%"></iframe>
        </div>
      </div>
    </div>
      `;

    // Add the new tab
    $("#tabs ul").append(tabTemplate);
    $("#tabs").append(tabContent);
    $("#tabs").tabs("refresh");

    // Make the new tab active
    var newIndex = $("#tabs ul li").length - 1; // Indexes are zero-based
    $("#tabs").tabs("option", "active", newIndex);

    // Close icon: removing the tab on click
    $("#tabs").on("click", "span.ui-icon-close", function () {
      var panelId = $(this).closest("li").remove().attr("aria-controls");
      $("#" + panelId).remove();
      $("#tabs").tabs("refresh");
    });

    initializeMonacoEditor("codeInput-" + numTabs);
  });

  $("#runButton").on("click", function runCode() {
    $("#tabs .tab-content").each(function () {
      if ($(this).css("display") !== "none") {
        var editorId = $(this).find(".codeInput").attr("id");
        var editorInstance = monaco.editor.getEditors().find(function (editor) {
          return editor._domElement.id === editorId;
        });
        var code = editorInstance.getModel().getValue();
        var resultFrame =
          $(this).find(".resultFrame")[0].contentDocument ||
          $(this).find(".resultFrame")[0].contentWindow.document;

        // Clear the content of resultFrame before writing new code
        resultFrame.open();
        resultFrame.write("");
        resultFrame.close();
        // Write the new code
        resultFrame.open();
        resultFrame.write(code);
        resultFrame.close();
      }
    });
  });

  $("#saveButton").on("click", function saveCode() {
    $("#tabs .tab-content").each(function () {
      if ($(this).css("display") !== "none") {
        var editorId = $(this).find(".codeInput").attr("id");
        var editorInstance = monaco.editor.getEditors().find(function (editor) {
          return editor._domElement.id === editorId;
        });
        var code = editorInstance.getModel().getValue();
        if (/\S/.test(code)) {
          var blob = new Blob([code], { type: "text/html;charset=utf-8" });
          saveAs(blob, "code.html");
        }
      }
    });
  });

  $("#darkModeToggle").on("click", () => {
    if ($("body").hasClass("dark-mode")) {
      $("body").removeClass("dark-mode");
      changeEditorTheme("vs-light");
    } else {
      $("body").toggleClass("dark-mode");
      changeEditorTheme("vs-dark");
    }
  });

  $("#layoutToggle").on("click", function toggleLayout() {
    var container = $(".container-full");

    if (container.hasClass("col-md-6")) {
      container.removeClass("col-md-6").addClass("col-md-12");
    } else {
      container.removeClass("col-md-12").addClass("col-md-6");
    }
  });
});
