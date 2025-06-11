// ==UserScript==
// @name         Autistic Chickens universal script
// @namespace    custom.autocasebuyer
// @version      4.0.0
// @description  For Funsies
// @match        https://case-clicker.com/*
// @updateURL    https://raw.githubusercontent.com/GCHD123/Autistic-Chickens-CCO-Script/main/autistic-chickens-script.user.js
// @downloadURL  https://raw.githubusercontent.com/GCHD123/Autistic-Chickens-CCO-Script/main/autistic-chickens-script.user.js
// @grant        GM_getValue
// @grant        GM_setValue
//
// @credits for parts of the script go to Miggy
//
// ==/UserScript==

(function () {
  'use strict';

  const API_BASE = "https://case-clicker.com/api";
  const BUY_INTERVAL_MS = 30000;
  const REWARDS_INTERVAL_MS = 30000;

  let price = 250;
  let secondsToSell = 15;
  let sellForMoney = false;
  let autoSellActive = false;

  let enabledAutoBuyer = false;
  let creatingCoinflip = false;
  let activeCoinflips = 0;
  let coinflipsCreatedToday = 0;
  const dailyCoinflipLimit = 150;
  let vaultActive = false;
  let rewardsActive = false;

  let totalsold = 0;
  let totalmoney = 0;

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  const originalSend = WebSocket.prototype.send;
  window.sockets = [];
  WebSocket.prototype.send = function (...args) {
    if (!window.sockets.includes(this)) window.sockets.push(this);
    return originalSend.apply(this, args);
  };

  const buttonContainer = document.createElement("div");
  Object.assign(buttonContainer.style, {
    position: "fixed",
    top: "10px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "9999",
    display: "flex",
    gap: "10px"
  });
  document.body.appendChild(buttonContainer);

  function createButton(label, onClick, bg = "#555") {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, {
      padding: "10px 20px",
      backgroundColor: bg,
      color: "#fff",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      fontWeight: "bold"
    });
    btn.onclick = onClick;
    return btn;
  }
  
  function setupSellCasesButton() {
    const btn = createButton("Sell All Cases", async () => {
      const confirmSell = confirm("Are you sure?");Add commentMore actions
      if (!confirmSell) return;

      btn.disabled = true;
      btn.textContent = "Selling...";

      const resCases = await fetch(`${API_BASE}/cases/cases`);
      const cases = await resCases.json();

      const resInv = await fetch(`${API_BASE}/cases`);
      const owned = await resInv.json();

      for (const item of cases) {
        const ownedCase = owned.find(o => o._id === item._id);
        if (ownedCase && ownedCase.amount > 0) {
          await fetch(`${API_BASE}/cases`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item._id, amount: ownedCase.amount, type: "case" })
          });
          totalsold += ownedCase.amount;
          totalmoney += item.price * ownedCase.amount;
        }
      }

      const profit = Math.round(totalmoney * 0.7);
      alert(`Sold ${totalsold} cases for a total of $${profit}`);
      btn.disabled = false;
      btn.textContent = "Sell All Cases";
      totalsold = 0;
      totalmoney = 0;
    });
    buttonContainer.appendChild(btn);
  }
Add comment

  function setupStuffMenu() {
    const btn = createButton("Stuff", () => {
      const existingMenu = document.getElementById("stuff-menu");
      if (existingMenu) return existingMenu.remove();

      const menu = document.createElement("div");
      menu.id = "stuff-menu";
      Object.assign(menu.style, {
        position: "fixed",
        top: "60px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#222",
        color: "#fff",
        padding: "20px",
        borderRadius: "10px",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      });

      const vaultBtn = createButton("Auto Vault: OFF", () => {
        vaultActive = !vaultActive;
        GM_setValue("vaultActive", vaultActive);
        vaultBtn.textContent = `Auto Vault: ${vaultActive ? "ON" : "OFF"}`;
        vaultBtn.style.backgroundColor = vaultActive ? "#0a0" : "#555";
      });
      vaultBtn.textContent = `Auto Vault: ${vaultActive ? "ON" : "OFF"}`;
      vaultBtn.style.backgroundColor = vaultActive ? "#0a0" : "#555";

      const rewardsBtn = createButton("Auto Rewards: OFF", () => {
        rewardsActive = !rewardsActive;
        GM_setValue("rewardsActive", rewardsActive);
        rewardsBtn.textContent = `Auto Rewards: ${rewardsActive ? "ON" : "OFF"}`;
        rewardsBtn.style.backgroundColor = rewardsActive ? "#0a0" : "#555";
      });
      rewardsBtn.textContent = `Auto Rewards: ${rewardsActive ? "ON" : "OFF"}`;
      rewardsBtn.style.backgroundColor = rewardsActive ? "#0a0" : "#555";

      const autosellSkinsToggle = createButton("AutoSell Skins: OFF", () => {
        autoSellActive = !autoSellActive;
        GM_setValue("autoSellActive", autoSellActive);
        autosellSkinsToggle.textContent = `AutoSell Skins: ${autoSellActive ? "ON" : "OFF"}`;
        autosellSkinsToggle.style.backgroundColor = autoSellActive ? "#0a0" : "#555";
      });

      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.value = price;
      priceInput.placeholder = "Price limit";
      priceInput.style.padding = "5px";
      priceInput.onchange = () => {
        price = Number(priceInput.value);
        GM_setValue("autoSellPrice", price);
      };

      const intervalInput = document.createElement("input");
      intervalInput.type = "number";
      intervalInput.value = secondsToSell;
      intervalInput.placeholder = "Interval (s)";
      intervalInput.style.padding = "5px";
      intervalInput.onchange = () => {
        secondsToSell = Number(intervalInput.value);
        GM_setValue("autoSellInterval", secondsToSell);
      };

      const currencySelect = document.createElement("select");
      currencySelect.style.padding = "5px";
      const optionMoney = new Option("Money", "money");
      const optionTokens = new Option("Tokens", "tokens");
      currencySelect.add(optionMoney);
      currencySelect.add(optionTokens);
      currencySelect.value = sellForMoney ? "money" : "tokens";
      currencySelect.onchange = () => {
        sellForMoney = currencySelect.value === "money";
        GM_setValue("autoSellCurrency", sellForMoney);
      };

      menu.appendChild(vaultBtn);
      menu.appendChild(rewardsBtn);
      menu.appendChild(autosellSkinsToggle);
      menu.appendChild(document.createTextNode("Price Limit:"));
      menu.appendChild(priceInput);
      menu.appendChild(document.createTextNode("Interval (s):"));
      menu.appendChild(intervalInput);
      menu.appendChild(document.createTextNode("Currency:"));
      menu.appendChild(currencySelect);

      document.body.appendChild(menu);
    });
    buttonContainer.appendChild(btn);
  }

  const sellSkins = async () => {
    try {
      const res = await fetch(`/api/inventory`, {
        method: "DELETE",
        body: JSON.stringify({ type: "price", value: price, currency: sellForMoney ? "money" : "tokens" }),
        headers: { "Content-Type": "application/json" },
      });
      if (![200, 429].includes(res.status)) sellSkins();
    } catch (e) {
      console.warn("AutoSell Skins error:", e);
    }
  };

  setInterval(() => {
    if (autoSellActive) sellSkins();
  }, secondsToSell * 1000);
  

  async function getBalance() {
    const res = await fetch(`${API_BASE}/me`);
    const json = await res.json();
    return json.money;
  }

  async function getCaseData() {
    const caseTitleElement = document.querySelector(".mantine-Title-root");
    const currentCaseName = caseTitleElement?.textContent?.trim();
    const res = await fetch(`${API_BASE}/cases/cases`);
    const cases = await res.json();
    return cases.find(c => c.name === currentCaseName);
  }

  async function buyCases(caseId, amount) {
    const res = await fetch(`${API_BASE}/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: caseId, amount, type: "case" })
    });
    if (!res.ok) throw new Error(JSON.stringify(await res.json()));
    return res.json();
  }

  async function tryBuy() {
    if (!enabledAutoBuyer) return;
    const balance = await getBalance();
    const caseObj = await getCaseData();
    if (!caseObj) return;
    const maxBuyable = Math.floor(balance / caseObj.price);
    try {
      await buyCases(caseObj._id, maxBuyable);
      console.log(`[AutoBuyer] Bought ${maxBuyable} cases.`);
    } catch (err) {
      console.error("[AutoBuyer] Error:", err);
    }
  }

  function setupAutoBuyerButton() {
    const btn = createButton("AutoBuyer: OFF", () => {
      enabledAutoBuyer = !enabledAutoBuyer;
      btn.textContent = `AutoBuyer: ${enabledAutoBuyer ? "ON" : "OFF"}`;
      btn.style.backgroundColor = enabledAutoBuyer ? "#0a0" : "#555";
    });
    buttonContainer.appendChild(btn);
  }

  function setupCoinflipButton() {
    const btn = createButton("Games", () => {
      const existingMenu = document.getElementById("game-menu");
      if (existingMenu) return existingMenu.remove();
      const menu = document.createElement("div");
      menu.id = "game-menu";
      Object.assign(menu.style, {
        position: "fixed",
        top: "60px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#222",
        color: "#fff",
        padding: "20px",
        borderRadius: "10px",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      });

      const toggleBtn = createButton("Create Coinflip: OFF", () => {
        creatingCoinflip = !creatingCoinflip;
        toggleBtn.textContent = `Create Coinflip: ${creatingCoinflip ? "ON" : "OFF"}`;
        toggleBtn.style.backgroundColor = creatingCoinflip ? "#0a0" : "#555";
        if (!creatingCoinflip) return;
        const bet = Number(betInput.value);
        if (!bet || isNaN(bet)) return;

        const intervalId = setInterval(() => {
          if (!creatingCoinflip || activeCoinflips >= 6 || coinflipsCreatedToday >= dailyCoinflipLimit) {
            creatingCoinflip = false;
            toggleBtn.textContent = "Create Coinflip: OFF";
            toggleBtn.style.backgroundColor = "#555";
            return clearInterval(intervalId);
          }
          const socket = window.sockets.find(s => s.readyState === WebSocket.OPEN);
          if (!socket) return;
          socket.send(`42[\"createGameCoinflip\",{"bet":${bet}}]`);
          coinflipsCreatedToday++;
        }, 1000);
      });

      const betInput = document.createElement("input");
      betInput.type = "number";
      betInput.placeholder = "Enter Coinflip Bet";
      Object.assign(betInput.style, { padding: "10px", marginTop: "10px" });

      menu.appendChild(toggleBtn);
      menu.appendChild(betInput);
      document.body.appendChild(menu);
    });
    buttonContainer.appendChild(btn);
  }

  const autoCollectVault = async () => {
    while (true) {
      if (vaultActive && window.sockets.length > 0) {
        try {
          window.sockets[window.sockets.length - 1].send('42["collectVault"]');
        } catch (e) {
          console.warn("Failed to send collectVault:", e);
        }
      }
      await sleep(60000);
    }
  };

  const autoCollectRewards = async () => {
    while (true) {
      if (rewardsActive) {
        try {
          const claimButtons = document.querySelectorAll("button");
          claimButtons.forEach(b => {
            if (b.textContent.trim().toLowerCase().includes("claim")) {
              b.click();
            }
          });
        } catch (e) {
          console.warn("Failed to auto-claim rewards:", e);
        }
      }
      await sleep(REWARDS_INTERVAL_MS);
    }
  };

  
  window.addEventListener("load", async () => {
    vaultActive = await GM_getValue("vaultActive", false);
    rewardsActive = await GM_getValue("rewardsActive", false);
    autoSellActive = await GM_getValue("autoSellActive", false);
    price = await GM_getValue("autoSellPrice", price);
    secondsToSell = await GM_getValue("autoSellInterval", secondsToSell);
    sellForMoney = await GM_getValue("autoSellCurrency", sellForMoney);
    
    setupAutoBuyerButton();
    setupCoinflipButton();
    setupSellCasesButton();
    setupStuffMenu();
    setInterval(tryBuy, BUY_INTERVAL_MS);
    autoCollectVault();
    autoCollectRewards();
  });
})();
