{
  class MyFirstComponent extends Jinkela {
    get template() {
      return `<div>{text}</div>`;
    }
    get styleSheet() {
      return `
        :scope {
          color: blue;
        }
      `;
    }
  }
  
  window.MyFirstComponent = MyFirstComponent
  new MyFirstComponent({ text: 'Jinkela' }).to(document.body);

  }
