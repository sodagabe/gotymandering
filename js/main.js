/* ------------------------ */
/* Classes                  */
/* ------------------------ */

class DataManager {
  static buildGameObject(gameRecord) {
    const name = gameRecord.name;
    const releaseDate = new Date(gameRecord.first_release_date * 1000);
    let gameGenres = [];
    if (gameRecord.genres) {
      gameGenres = gameRecord.genres.map((genreID) => {
        return genres.find((genre) => genre.id === genreID).name;
      });
    }
    const rating = gameRecord.total_rating;
    return new Game(gameRecord.id, name, releaseDate, gameGenres, rating);
  }

  static buildGenreObject(genreRecord) {
    return new Genre(genreRecord.id, genreRecord.name);
  }

  static async fetchGenres() {
    try {
      const url = "../data/genres.json";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const jsonDB = await response.json();
      for (let genreRecord of jsonDB) {
        const genre = this.buildGenreObject(genreRecord);
        genres.push(genre);
      }
    } catch (e) {
      console.error(e);
    }
  }

  static async fetchDB(games) {
    try {
      this.fetchGenres();
      const url = "../data/games.json";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const jsonDB = await response.json();
      for (let gameRecord of jsonDB) {
        const game = this.buildGameObject(gameRecord);
        games.push(game);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

class Genre {
  #id;
  #name;

  constructor(id, name) {
    this.#id = id;
    this.#name = name;
  }

  get id() {
    return this.#id;
  }

  get name() {
    return this.#name;
  }
}

class Game {
  #id;
  name;
  #releaseDate;
  #genres;
  rating;

  constructor(id, name, releaseDate, genres, rating) {
    this.#id = id;
    this.name = name;
    this.#releaseDate = releaseDate;
    this.#genres = genres;
    this.rating = rating;
  }

  get id() {
    return this.#id;
  }

  get genres() {
    let genres = "";
    for (const [i, genre] of this.#genres.entries()) {
      genres += genre;
      if (i !== this.#genres.length - 1) {
        genres += " | ";
      }
    }
    return genres;
  }

  get releaseDate() {
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const values = formatter.formatToParts(this.#releaseDate);
    const releaseDate = values
      .map(({ type, value }) => {
        switch (type) {
          case "month":
            return value;
          case "day":
            return ` ${value}`;
          case "year":
            return `, ${value}`;
        }
      })
      .join("");
    return releaseDate;
  }
}

class EventManager {
  constructor() {
    // Clear list
    const clearListBtn = document.querySelector("#btn-clear-list");
    clearListBtn.onclick = () => gotyList.clear();
    // Add game to list
    const gameInput = document.querySelector("#game-input");
    const gameInputOptions = document.querySelector("#game-input-options");
    gameInput.addEventListener("input", (e) => {
      const selectedOption = gameInputOptions.options.namedItem(e.target.value);
      if (selectedOption) {
        const selectedGameID = parseInt(selectedOption.id);
        const game = games.find((game) => game.id === selectedGameID);
        gotyList.add(game);
      }
    });
  }

  static gameDeleteButton(button, game) {
    const attributeName = "data-game-id";
    button.setAttribute(attributeName, game.id);
    button.onclick = (e) => {
      const gameIDString = button.getAttribute(attributeName);
      const gameID = parseInt(gameIDString);
      gotyList.deleteGame(gameID);
    };
    return button;
  }
}

class StorageController {
  static #gameListKey = "gameList";

  static loadGameList() {
    const stringList = localStorage.getItem(this.#gameListKey);
    let gameList = [];
    const JSONList = JSON.parse(stringList);
    if (JSONList) {
      gameList = JSONList.map((gameID) =>
        games.find((game) => game.id === gameID),
      );
    }
    return gameList;
  }

  static saveGameList(gameList = []) {
    const idList = gameList.map((game) => game.id);
    const JSONList = JSON.stringify(idList);
    localStorage.setItem(this.#gameListKey, JSONList);
  }
}

class OrderedListController {
  #elements;
  #orderedList;

  constructor(orderedList = []) {
    this.#orderedList = orderedList;
    this.#elements = new Set(this.#orderedList);
  }

  get list() {
    return this.#orderedList;
  }

  get length() {
    return this.#elements.size;
  }

  get avgScore() {
    let games = this.#orderedList;
    const rawAvg = games.reduce((accumulator, value, i) => {
      let sum = accumulator + value.rating;
      if (games.length && i === games.length - 1) {
        sum /= games.length;
      }
      return sum;
    }, 0);
    return rawAvg.toFixed(2);
  }

  add(game, order = 1) {
    let updated = false;
    const currentLength = this.length;
    this.#elements.add(game);
    const newLength = this.length;
    if (currentLength != newLength) {
      if (order < 1) {
        this.#orderedList.unshift(game);
      } else if (order > newLength) {
        this.#orderedList.push(game);
      } else {
        const listTail = this.#orderedList.splice(order - 1);
        this.#orderedList.push(game);
        this.#orderedList.push(...listTail);
      }
      updated = true;
      StorageController.saveGameList(this.#orderedList);
    }
    return updated;
  }

  clear() {
    this.#elements.clear();
    this.#orderedList = [];
    StorageController.saveGameList();
  }

  deleteGame(gameID) {
    const game = games.find((game) => game.id === gameID);
    this.#elements.delete(game);
    this.#orderedList = this.#orderedList.filter((game) => game.id !== gameID);
    StorageController.saveGameList(this.list);
  }
}

class IconRenderer {
  static icon(name) {
    const icon = document.createElement("i");
    icon.className = `bi bi-${name}`;
    return icon;
  }

  static _button(name, variantBase, danger = false, variant = null) {
    const icon = this.icon(name);
    const button = document.createElement("button");
    button.appendChild(icon);
    button.className = "btn";
    let btnVariant = variant ?? "primary";
    if (danger) {
      btnVariant = "danger";
    }
    button.classList.add(`${variantBase}-${btnVariant}`);
    return button;
  }

  static solidButton(name, danger = false, variant = null) {
    return this._button(name, "btn", danger, variant);
  }

  static outlineButton(name, danger = false, variant = null) {
    return this._button(name, "btn-outline", danger, variant);
  }
}

class GameRenderer {
  game;

  constructor(game) {
    this.game = game;
  }

  listCard() {
    const cardContainer = document.createElement("article");
    const card = document.createElement("div");
    const cardBody = document.createElement("div");
    const cardTitle = document.createElement("h5");
    const cardGenres = document.createElement("h6");
    const cardReleaseDate = document.createElement("p");
    cardContainer.className = "col";
    card.className = "card card--game";
    cardBody.className = "card-body";
    cardTitle.className = "card-title text-truncate";
    cardTitle.textContent = this.game.name;
    cardGenres.className = "card-subtitle text-secondary small text-truncate";
    cardGenres.textContent = this.game.genres;
    cardReleaseDate.className = "card-text small";
    cardReleaseDate.textContent = this.game.releaseDate;
    cardBody.appendChild(cardTitle);
    cardBody.appendChild(cardGenres);
    cardBody.appendChild(cardReleaseDate);
    let trashIconButton = IconRenderer.outlineButton("x-lg", true);
    EventManager.gameDeleteButton(trashIconButton, this.game);
    trashIconButton.classList.add("btn--delete");
    cardBody.appendChild(trashIconButton);
    card.appendChild(cardBody);
    cardContainer.appendChild(card);
    return cardContainer;
  }

  candidateOption() {
    const option = document.createElement("option");
    option.value = this.game.name;
    option.setAttribute("name", this.game.name);
    option.setAttribute("id", this.game.id);
    return option;
  }
}

class GameListRenderer {
  #games;
  #parentElement;
  #footerElement;
  #avgScoreElement;

  constructor(games, parentElement, footerElement) {
    this.#games = games;
    this.#parentElement = parentElement;
    this.#footerElement = footerElement;
    this.#avgScoreElement =
      this.#footerElement.querySelector("#span-avg-score");
  }

  render(avgScore = 0, newList = null) {
    this.#games = newList ?? this.#games;
    this.#parentElement.textContent = "";
    const gameRenderer = new GameRenderer();
    for (const game of this.#games) {
      gameRenderer.game = game;
      const gameRender = gameRenderer.listCard();
      this.#parentElement.appendChild(gameRender);
    }
    const needsFooter = this.#games.length > 1;
    const utilityClass = "d-none";
    if (needsFooter) {
      this.#footerElement.classList.remove(utilityClass);
      this.#avgScoreElement.textContent = avgScore;
    } else {
      this.#footerElement.classList.add(utilityClass);
    }
  }
}

class GOTYList {
  #controller;
  #renderer;

  constructor(listElement, footerElement) {
    const savedList = StorageController.loadGameList() ?? [];
    this.#controller = new OrderedListController(savedList);
    this.#renderer = new GameListRenderer(
      this.games,
      listElement,
      footerElement,
    );
    this.#renderer.render(this.avgScore);
  }

  get games() {
    return this.#controller.list;
  }

  get avgScore() {
    return this.#controller.avgScore;
  }

  add(game, order = 1) {
    const updated = this.#controller.add(game, order);
    if (updated) {
      this.#renderer.render(this.avgScore, this.games);
    }
  }

  clear() {
    this.#controller.clear();
    this.#renderer.render(undefined, this.games);
  }

  deleteGame(gameID) {
    this.#controller.deleteGame(gameID);
    this.#renderer.render(this.avgScore, this.games);
  }
}

/* ------------------------ */
/* Setup                    */
/* ------------------------ */

// Load JSON database into objects
const genres = [];
const games = [];
let gotyList;
DataManager.fetchDB(games).then(() => {
  // Start main controller
  const listSection = document.querySelector("#goty-list");
  const listFooterDiv = document.querySelector("#div-list-footer");
  gotyList = new GOTYList(listSection, listFooterDiv);
  // Populate input's datalist with candidates
  const gameInputOptions = document.querySelector("#game-input-options");
  const renderer = new GameRenderer();
  for (let game of games) {
    renderer.game = game;
    gameInputOptions.appendChild(renderer.candidateOption());
  }
});

// Load events
const eventManager = new EventManager();
