(function() {

  var app = window.app || {};

  app.todoCollection = (function () {
    var _this = this;

    function getTodos() {
      var collection = JSON.parse(localStorage.getItem('todoCollection'));
      if (collection) {
        _this.todos = collection;
      };
      logState();
      return _this.todos;
    };

    function getTodo(id) {
      var todos = _this.todos;
      if (todos[id]) {
        return todos[id];
      } else {
        return {};
      }
    }

    function deleteTodo(id) {
      var todos = _this.todos;
      var deleteTodo = getTodo(id);
      todos.splice(todos.indexOf(deleteTodo), 1);
      sync();
      //logState();
    };

    function saveTodo(model) {
      var todos = _this.todos;
      if (todos.indexOf(model) < 0) {
        todos.push(model);
      } else {
        todos[todos.indexOf(model)] = model;
      }
      sync();
      //logState();
    }

    function sync() {
      localStorage.setItem('todoCollection', JSON.stringify(_this.todos));
    }

    function logState() {
      console.log(localStorage.getItem('todoCollection'));
    }

    function reset() {
      _this.todos = [
        /*{id: 1, content: 'Todo nr 1', flag: true},
        {id: 2, content: 'Todo nr 2', flag: true},
        {id: 3, content: 'Todo nr 3', flag: true}*/
      ];
      sync();
     //logState();
    }

    getTodos();
    return {
      getTodos: getTodos,
      getTodo: getTodo,
      deleteTodo: deleteTodo,
      saveTodo: saveTodo,
      reset: reset
    };

  })();




  Todo = function(content) {
    this.content = content || '',
    this.flag = 'active'
  };




  app.todoView = (function() {
    var _this = this;
    this.element = document.getElementById('todoList');

    this.render = function(collection) {
      _this.element.innerHTML = '';
      var listFrag = document.createDocumentFragment();
      listFrag.innerHTML = '';

      for (var i = 0; i < collection.length; i++) {
        var item = collection[i];
        var checked = item.flag == false ? 'checked' : '';
        var liFrag = [];
        liFrag.push('<li class="'+ checked +'" data-todoID="'+i+'">');
        liFrag.push('<span class="checkbox"><input type="checkbox" '+ checked +' /></span>');
        liFrag.push('<span class="li-content text-left">'+item.content+'</span>');
        liFrag.push('<span class="action text-right"><button class="btn-delete" data-todoID="'+i+'">x</button></span>');
        liFrag.push('</li>');
        var liSum = liFrag.reduce(function(a, b) {
          return a+b;
        });
        listFrag.innerHTML += liSum;
      }

      element.innerHTML = listFrag.innerHTML;
    };

    return {
      render: render
    }
  })();




  app.todoController = {
    element: document.getElementById('listWrapper'),

    init: function() {
      this.bindActions(this.element);
      app.todoView.render(app.todoCollection.getTodos());
    },

    bindActions: function(element) {
      var _this = this;

      element.onclick = function(e) {
        var el = e.target;
        var wrapper = el.parentNode.parentNode;

        if (el) {
          if (el.classList.contains('btn-delete')) {
            _this.deleteTodo(el, wrapper)
          }
          if (el.type === 'checkbox') {
            _this.updateTodoState(el, wrapper);
          }
          if (el.id === 'todoAdd') {
            _this.addTodo();
          }
          /*if (el.classList.contains('li-content')) {
           var currentContent = el.innerHTML;
           el.innerHTML = '<input type="text" class="input-regular" value="'+currentContent+'" />';
           return;
           }
           if (el.classList.contains('input-regular')) {
           return;
           }*/
        }
      }

      document.getElementById('resetList').onclick = function(e) {
        app.todoCollection.reset();
        app.todoView.render(app.todoCollection.getTodos());
      };
    },

    deleteTodo: function(el, wrapper) {
      var todoId = wrapper.dataset.todoid;
      app.todoCollection.deleteTodo(todoId);
      app.todoView.render(app.todoCollection.getTodos());
    },

    updateTodoState: function(el, wrapper) {
      var todoId = wrapper.dataset.todoid;
      var updatedTodo = app.todoCollection.getTodo(todoId);
      updatedTodo.flag = !updatedTodo.flag;
      app.todoCollection.saveTodo(updatedTodo);
      app.todoView.render(app.todoCollection.getTodos());
    },

    addTodo: function() {
      var content = document.getElementById('todoAdd-content').value;
      var newTodo = new Todo(content);
      console.log(newTodo);
      app.todoCollection.saveTodo(newTodo);
      document.getElementById('todoAdd-content').value = '';
      app.todoView.render(app.todoCollection.getTodos());
    }
  };

  app.todoController.init();


})();
