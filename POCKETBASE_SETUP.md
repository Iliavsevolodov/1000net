# PocketBase setup для 1000 НЕТ

## 1. Переменная окружения

В GitHub Actions добавь secret:

```text
VITE_POCKETBASE_URL=https://api.your-domain.ru
```

Пока переменной нет, сайт работает локально.

## 2. Коллекции

### users

Используется стандартная auth-коллекция PocketBase.

### progress

Поля:

```text
user      relation -> users, required
noCount   number
themeId   text
darkMode  bool
startDate text
```

Rules:

```text
List/Search: @request.auth.id = user.id
View:        @request.auth.id = user.id
Create:      @request.auth.id = user.id
Update:      @request.auth.id = user.id
Delete:      @request.auth.id = user.id
```

### daily_logs

Поля:

```text
user   relation -> users, required
date   text
count  number
```

Rules:

```text
List/Search: @request.auth.id = user.id
View:        @request.auth.id = user.id
Create:      @request.auth.id = user.id
Update:      @request.auth.id = user.id
Delete:      @request.auth.id = user.id
```

### saved_quotes

Поля:

```text
user      relation -> users, required
quoteText text
```

Rules:

```text
List/Search: @request.auth.id = user.id
View:        @request.auth.id = user.id
Create:      @request.auth.id = user.id
Update:      @request.auth.id = user.id
Delete:      @request.auth.id = user.id
```

## 3. Следующий этап

После запуска PocketBase и добавления `VITE_POCKETBASE_URL` можно подключать UI:

- вход;
- регистрация;
- кнопка синхронизации;
- восстановление данных из облака;
- статус `Локально / Облако`.
