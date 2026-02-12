import Swal from "https://cdn.skypack.dev/sweetalert2";

/* ------------------------ */
/* Constants                */
/* ------------------------ */
const GENRES = [];
const GAMES = [];

const CLASS_NAMES = {
  gameCard: "card--game",
};

const ATTRIBUTE_NAMES = {
  gameID: "data-game-id",
};

const SORTABLE_CONFIG = {
  animation: 120,
  direction: "vertical",
  ghostClass: "sortable--ghost",
  chosenClass: "sortable--chosen",
  dragClass: "sortable--drag",
  fallbackClass: "sortable--fallback",
  forceFallback: true,
  scrollSpeed: 50,
};

/* ------------------------ */
/* Classes                  */
/* ------------------------ */

/* Models & data */

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

class DataManager {
  static #apiBaseURL = "https://api.npoint.io/";
  static #apiURIs = {
    games: "32bb44811fc626c1f75e",
    genres: "cce6a933a8c2d67c4b41",
  };

  static buildURL(uri) {
    return this.#apiBaseURL + uri;
  }

  static buildGameObject(gameRecord) {
    const name = gameRecord.name;
    const releaseDate = new Date(gameRecord.first_release_date * 1000);
    let gameGenres = [];
    if (gameRecord.genres) {
      gameGenres = gameRecord.genres.map((genreID) => {
        return GENRES.find((genre) => genre.id === genreID).name;
      });
    }
    const rating = gameRecord.total_rating;
    return new Game(gameRecord.id, name, releaseDate, gameGenres, rating);
  }

  static buildGenreObject(genreRecord) {
    return new Genre(genreRecord.id, genreRecord.name);
  }

  static async fetchData(uri, f) {
    try {
      const url = this.buildURL(uri);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const jsonDB = await response.json();
      f(jsonDB);
    } catch (e) {
      console.error(e);
    }
  }

  static async fetchGenres() {
    await this.fetchData(this.#apiURIs.genres, (res) => {
      for (let genreRecord of res) {
        const genre = this.buildGenreObject(genreRecord);
        GENRES.push(genre);
      }
    });
  }

  static async fetchGames() {
    await this.fetchData(this.#apiURIs.games, (res) => {
      for (let gameRecord of res) {
        const game = this.buildGameObject(gameRecord);
        GAMES.push(game);
      }
    });
  }

  static async fetchDB() {
    await this.fetchGenres();
    await this.fetchGames();
  }
}

/* Interfaces */

class ModalInterface {
  static #fireSwal({
    swalObject,
    modalOptions,
    confirmedFunction = () => {},
    deniedFunction = () => {},
    dismissedFunction = () => {},
  }) {
    swalObject.fire(modalOptions).then((result) => {
      if (result.isConfirmed) {
        confirmedFunction(result);
      } else if (result.isDenied) {
        deniedFunction(result);
      } else {
        dismissedFunction(result);
      }
    });
  }

  static #destructive() {
    return Swal.mixin({
      customClass: {
        confirmButton: "btn btn-danger",
        cancelButton: "btn btn-secondary",
      },
      buttonsStyling: false,
    });
  }

  static delete({
    title,
    text,
    confirmButtonText = "Yes, delete",
    confirmedFunction,
    dismissedFunction,
    ...modalOptions
  }) {
    this.#fireSwal({
      swalObject: this.#destructive(),
      modalOptions: {
        title: title,
        text: text,
        confirmButtonText: confirmButtonText,
        showCancelButton: true,
        reverseButtons: true,
        focusCancel: true,
        ...modalOptions,
      },
      confirmedFunction: confirmedFunction,
      dismissedFunction: dismissedFunction,
    });
  }
}

class DragNDropInterface {
  static updatePosition(evt) {
    let gameCard = evt.item;
    const className = CLASS_NAMES.gameCard;
    while (!gameCard.classList.contains(className)) {
      gameCard = gameCard.firstElementChild;
    }
    const oldIndex = evt.oldDraggableIndex;
    const newIndex = evt.newDraggableIndex;
    EventManager.updatePosition(gameCard, oldIndex, newIndex);
  }
}

/* Controllers */

class StorageController {
  static #gameListKey = "gameList";

  static loadGameList() {
    const stringList = localStorage.getItem(this.#gameListKey);
    let gameList = [];
    const JSONList = JSON.parse(stringList);
    if (JSONList) {
      gameList = JSONList.map((gameID) =>
        GAMES.find((game) => game.id === gameID),
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

  #insert(game, index) {
    if (index <= 0) {
      this.#orderedList.unshift(game);
    } else if (index >= this.#orderedList.length) {
      this.#orderedList.push(game);
    } else {
      const listTail = this.#orderedList.splice(index);
      this.#orderedList.push(game);
      this.#orderedList.push(...listTail);
    }
  }

  #remove(gameToRemove) {
    this.#orderedList = this.#orderedList.filter(
      (game) => game !== gameToRemove,
    );
  }

  add(game, order = 1) {
    let updated = false;
    if (!this.#elements.has(game)) {
      this.#elements.add(game);
      this.#insert(game, order - 1);
      updated = true;
      StorageController.saveGameList(this.#orderedList);
    }
    return updated;
  }

  updatePosition(gameID, oldIndex, newIndex) {
    const game = this.#orderedList[oldIndex];
    if (game.id !== gameID) {
      throw new Error("Position mismatch between controller and DOM");
    }
    this.#remove(game);
    this.#insert(game, newIndex);
    StorageController.saveGameList(this.#orderedList);
  }

  clear() {
    this.#elements.clear();
    this.#orderedList = [];
    StorageController.saveGameList();
  }

  delete(gameID) {
    const game = GAMES.find((game) => game.id === gameID);
    this.#elements.delete(game);
    this.#remove(game);
    StorageController.saveGameList(this.list);
  }
}

/* Renderers */

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
    cardContainer.className = "card-container sortable col";
    card.className = `card ${CLASS_NAMES.gameCard}`;
    card.setAttribute(ATTRIBUTE_NAMES.gameID, this.game.id);
    cardBody.className = "card-body";
    cardTitle.className = "card-title text-truncate";
    cardTitle.textContent = this.game.name;
    cardGenres.className = "card-subtitle small text-truncate";
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

/* Misc */

class EventManager {
  constructor() {
    // Clear list
    const clearListBtn = document.querySelector("#btn-clear-list");
    clearListBtn.onclick = () => {
      ModalInterface.delete({
        title: "Clear your list?",
        text: "This will remove every game you've added",
        confirmedFunction: () => gotyList.clear(),
      });
    };
    // Add game to list
    const gameInput = document.querySelector("#game-input");
    const gameInputOptions = document.querySelector("#game-input-options");
    gameInput.addEventListener("input", (e) => {
      const selectedOption = gameInputOptions.options.namedItem(e.target.value);
      if (selectedOption) {
        const selectedGameID = parseInt(selectedOption.id);
        const game = GAMES.find((game) => game.id === selectedGameID);
        gotyList.add(game);
        gameInput.value = "";
      }
    });
  }

  static gameDeleteButton(button, game) {
    const attributeName = ATTRIBUTE_NAMES.gameID;
    button.setAttribute(attributeName, game.id);
    button.onclick = () => {
      ModalInterface.delete({
        title: `Delete ${game.name}?`,
        text: "You will have to re-add it manually",
        confirmedFunction: () => {
          const gameIDString = button.getAttribute(attributeName);
          const gameID = parseInt(gameIDString);
          gotyList.delete(gameID);
        },
      });
    };
    return button;
  }

  static updatePosition(gameCard, oldIndex, newIndex) {
    const gameIDString = gameCard.getAttribute(ATTRIBUTE_NAMES.gameID);
    const gameID = parseInt(gameIDString);
    gotyList.updatePosition(gameID, oldIndex, newIndex);
  }
}

/* Main controller */

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

  updatePosition(gameID, oldIndex, newIndex) {
    this.#controller.updatePosition(gameID, oldIndex, newIndex);
  }

  clear() {
    this.#controller.clear();
    this.#renderer.render(undefined, this.games);
  }

  delete(gameID) {
    this.#controller.delete(gameID);
    this.#renderer.render(this.avgScore, this.games);
  }
}

/* ------------------------ */
/* Setup                    */
/* ------------------------ */

// Load JSON database into objects
let gotyList;
DataManager.fetchDB().then(() => {
  // Start Sortable
  const listSection = document.querySelector("#goty-list");
  Sortable.create(listSection, {
    ...SORTABLE_CONFIG,
    onEnd: (evt) => {
      DragNDropInterface.updatePosition(evt);
    },
  });
  // Start main controller
  const listFooterDiv = document.querySelector("#div-list-footer");
  gotyList = new GOTYList(listSection, listFooterDiv);
  // Populate input's datalist with candidates
  const gameInputOptions = document.querySelector("#game-input-options");
  const renderer = new GameRenderer();
  for (let game of GAMES) {
    renderer.game = game;
    gameInputOptions.appendChild(renderer.candidateOption());
  }
});

// Load events
new EventManager();
