if (window.location.pathname === '/chat') {
  console.log('from chat page')

  // Данно строчкой мы всегда получаем актуальную строку подключения
  // Нам не нужно беспокоиться о том какой тип соединения у нас на текущий момент
  // http -> ws
  // https -> wss
  const socket = new WebSocket(window.location.origin.replace('http', 'ws'))
  const messageForm = document.forms.chat
  const chatContainer = document.querySelector('[data-chat]')

  const submitHandler = (e) => {
    e.preventDefault()
    const { message: { value } } = e.target

    // Придерживаюсь своей концепции, что все сообщения — это объекты, которые
    // как минимум содержат поле type
    // А также могут содержат какую-то полезную нагрузку (payload)
    const messageToServer = {
      type: 'newMessage',
      payload: {
        message: value,
      },
    }
    console.log(socket)
    // Для отправки сообщения используем метод .send()
    socket.send(JSON.stringify(messageToServer))
    e.target.message.value = ''
  }

  socket.onopen = function (e) {
    const messageToServer = {
      type: 'greeting',
    }
    // Отправляю привественное сообщение, в момент установки WebSocket соединения
    socket.send(JSON.stringify(messageToServer))
    // На форму вешаю обработчик события только если установлено WebSocket соединение
    messageForm.addEventListener('submit', submitHandler)
  }

  socket.onmessage = function (event) {
    const parseMessage = JSON.parse(event.data)

    // Логика аналогична серверной
    switch (parseMessage.type) {
      case 'greeting':
        chatContainer.insertAdjacentHTML('beforeend', `<div class="greeting">Say hi to user: ${parseMessage.payload.userName}</div>`)
        break
      case 'newMessage':
        chatContainer.insertAdjacentHTML('beforeend', `<div class="message ${parseMessage.payload.itself && 'my-message'}" >
          <span class="userName">${parseMessage.payload.userName}:</span>
          <span>${parseMessage.payload.message}</span>
          </div>`)
        break
      default:
        break
    }
  }

  socket.onclose = function (event) {
    if (event.wasClean) {
      alert(`[close] Соединение закрыто чисто, код=${event.code} причина=${event.reason}`)
    } else {
      // например, сервер убил процесс или сеть недоступна
      // обычно в этом случае event.code 1006
      alert('[close] Соединение прервано')
    }
  }
}
