import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class TodoPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "todoPanel";
  private view?: vscode.WebviewView;
  private todoFilePath: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    const dir = path.join(context.globalStorageUri.fsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.todoFilePath = path.join(dir, "todos.json");
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
    const raw = fs.readFileSync(this.todoFilePath, "utf8");
    return JSON.parse(raw);
  }

  private saveTodos(todos: { text: string; done: boolean }[]) {
    fs.writeFileSync(this.todoFilePath, JSON.stringify(todos, null, 2), "utf8");
  }

  private getHtml(todos: { text: string; done: boolean }[]): string {
    const items = todos
      .map(
        (t, i) => `
        <li>
          <input type="checkbox" ${t.done ? "checked" : ""} data-index="${i}" />
          <span style="text-decoration: ${t.done ? "line-through" : "none"};">${
          t.text
        }</span>
        </li>
      `
      )
      .join("");

    return `
      <html>
        <body style="padding: 10px;">
          <form id="todo-form">
            <input type="text" id="new-todo" placeholder="Add a task" style="width: 80%;" />
            <button type="submit">Add</button>
          </form>
          <ul id="todo-list">${items}</ul>

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
