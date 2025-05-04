import * as vscode from "vscode";

export class PaperStartupView implements vscode.WebviewViewProvider {
  public static readonly viewType = "paperStartupView";

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(view: vscode.WebviewView) {
    view.webview.options = {
      enableScripts: true,
    };

    view.webview.html = `
      <html>
        <body style="padding:16px; font-family: var(--vscode-font-family); background-color: var(--vscode-sideBar-background); color: var(--vscode-foreground);">
          <h3>Paper: Notes + Todos</h3>
          <p>No folder selected.</p>
          <button id="selectFolder" style="
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 14px;
            border-radius: 4px;
            cursor: pointer;
          ">
            Select a folder to get started
          </button>

          <script>
            const vscode = acquireVsCodeApi();
            document.getElementById('selectFolder').addEventListener('click', () => {
              vscode.postMessage({ type: 'select-folder' });
            });
          </script>
        </body>
      </html>
    `;

    view.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === "select-folder") {
        await vscode.commands.executeCommand("paper.selectNotesDirectory");
      }
    });
  }
}
