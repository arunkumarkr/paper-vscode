import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { INTERNAL_TODO_FILENAME } from "./constants";

export class TodoPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "todoPanel";
  private view?: vscode.WebviewView;
  private todoFilePath: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    // const dir = path.join(context.globalStorageUri.fsPath);

    // Get the notes directory set by the user
    const dir = context.workspaceState.get<string>("notesDirectory");

    if (!dir) {
      throw new Error(
        "Notes directory is not set. Please select a notes folder first."
      );
    }

    // Ensure the directory exists (safe fallback)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Set the path for the todos.json file inside the notes folder
    this.todoFilePath = path.join(dir, INTERNAL_TODO_FILENAME);

    // Create the file if it doesn't exist
    if (!fs.existsSync(this.todoFilePath)) {
      fs.writeFileSync(this.todoFilePath, "[]", "utf8");
    }
  }

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
    };

    view.webview.html = this.getHtml(this.readTodos());

    view.webview.onDidReceiveMessage((message) => {
      if (message.type === "add") {
        const todos = this.readTodos();
        todos.push({ text: message.text, done: false });
        this.saveTodos(todos);
        view.webview.html = this.getHtml(todos);
      } else if (message.type === "toggle") {
        const todos = this.readTodos();
        todos[message.index].done = !todos[message.index].done;
        this.saveTodos(todos);
        view.webview.html = this.getHtml(todos);
      }
    });
  }

  private readTodos(): { text: string; done: boolean }[] {
    try {
      if (!fs.existsSync(this.todoFilePath)) {
        return [];
      }
      const raw = fs.readFileSync(this.todoFilePath, "utf8");
      return JSON.parse(raw);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unknown error while reading todos.";
      vscode.window.showErrorMessage("Failed to read todos.json: " + message);
      return [];
    }
  }

  private saveTodos(todos: { text: string; done: boolean }[]) {
    fs.writeFileSync(this.todoFilePath, JSON.stringify(todos, null, 2), "utf8");
  }

  private getHtml(todos: { text: string; done: boolean }[]): string {
    const items = todos
      .map(
        (t, i) => `
          <li style="margin: 4px 0; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${
              t.done ? "checked" : ""
            } data-index="${i}" />
            <span style="text-decoration: ${
              t.done ? "line-through" : "none"
            }; color: var(--vscode-foreground);">
              ${t.text}
            </span>
          </li>
        `
      )
      .join("");

    return `
      <html>
        <head>
          <style>
            body {
              padding: 8px;
              background-color: var(--vscode-sideBar-background);
              color: var(--vscode-foreground);
              font-family: var(--vscode-font-family);
              font-size: var(--vscode-font-size);
            }
            input[type="text"] {
              padding: 4px 8px;
              background-color: var(--vscode-input-background);
              color: var(--vscode-input-foreground);
              border: 1px solid var(--vscode-input-border);
              border-radius: 2px;
              outline: none;
            }
            button {
              margin-top: 8px;
              background-color: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
              border: none;
              padding: 5px 10px;
              border-radius: 2px;
              cursor: pointer;
            }
            button:hover {
              background-color: var(--vscode-button-hoverBackground);
            }
            #todo-form{
              display: flex;
              flex-direction:column
            }
          </style>
        </head>
        <body>
          <form id="todo-form">
            <input type="text" id="new-todo" placeholder="Add a task" />
            <button type="submit">Add</button>
          </form>
          <ul style="list-style: none; padding-left: 0;">${items}</ul>
  
          <script>
            const vscode = acquireVsCodeApi();
            document.getElementById('todo-form').addEventListener('submit', e => {
              e.preventDefault();
              const input = document.getElementById('new-todo');
              if (input.value.trim()) {
                vscode.postMessage({ type: 'add', text: input.value.trim() });
                input.value = '';
              }
            });
  
            document.querySelectorAll('input[type="checkbox"]').forEach(box => {
              box.addEventListener('change', () => {
                const index = parseInt(box.dataset.index);
                vscode.postMessage({ type: 'toggle', index });
              });
            });
          </script>
        </body>
      </html>
    `;
  }
}
