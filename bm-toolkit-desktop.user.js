// ==UserScript==
// @name Battlemetrics Toolkit - Desktop
// @namespace https://www.battlemetrics.com/
// @version 12.15
// @updateURL https://raw.githubusercontent.com/liquid-gaming/bm-userscript/main/bm-toolkit-desktop.user.js
// @downloadURL https://raw.githubusercontent.com/liquid-gaming/bm-userscript/main/bm-toolkit-desktop.user.js
// @description Modifies the rcon panel for battlemetrics to help color code important events and details about players.
// @author Cephomet
// @match https://www.battlemetrics.com/*
// @icon https://www.google.com/s2/favicons?sz=64&domain=battlemetrics.com
// @grant GM_addStyle
// @grant GM_xmlhttpRequest
// @connect communitybanlist.com
// @run-at document-end
// ==/UserScript==
const version="12.15";const updateRate=150;const colors={cTeamBluefor:"#4eacff",cTeamOpfor:"#d0b1ff",cTeamIndepend:"#fd6aff",cAdminName:"#00fff7",cbmAdmin:"#58ff47",cModAction:"#ff3333",cAdminAction:"#37ff00",cTeamKilled:"#ffcc00",cLeftServer:"#d9a6a6",cJoined:"#919191",cGrayed:"#919191",cTracked:"#FF931A",cNoteColorIcon:"#f5ccff"};const selectors={root:"#root",rconLayout:"#RCONLayout",rconContainer:"#RCONContainer",serverLayout:"#RCONServerLayout",serverCommands:"#server-commands",serverCommandButtons:"#server-commands button[data-command]",playerPage:"#RCONPlayerPage",playerName:"#RCONPlayerPage h1",playerLinks:'a[href^="/rcon/players/"]',activity:'[data-testid="activity"]',activityItems:'[data-testid="activity-item"]',timestamps:"time[datetime], [datetime]",steamId:'[title*="765"]',eosId:'[title*="0002"]',ovhLogo:"#poweredbyovh"};const sets={teamKilled:new Set(["team killed"]),grayedOut:new Set(["AFK - Thanks for playing!","Please get a Squad Leader kit within 8 mins","Final warning: Get Squad Leader kit within 5m","SEEDING WHITELIST ACTIVE! Thanks for helping seed the server!","You will be kicked in 2 minutes if you are still not in a squad","To switch teams, please run the","Check your seeding reward status via","Trigger added flag LiQ Seeder"]),trackedTriggers:new Set(["[SL Kit]"]),leftServer:new Set(["left the server"]),joinedServer:new Set(["joined the server"]),actionList:new Set(["was warned","was kicked","was banned","edited BattleMetrics Ban","added BattleMetrics Ban","deleted BattleMetrics Ban","Trigger added flag Previously banned"]),adminList:new Set(["Amen774","ANGEL_42","AWMDemons","basa/doc","bloodmoon529","Capt-Crossbones","Chillz","davisfoxes","dontfakeit","Ethan","ETXBONES","Exploits","got2bhockey","budge","chaot3ch","GRIM_CURLY","HellHound6396","hellsaber","iCampHard","Jonboy","Kibz","Kyle","Ligmas","Lucrass Kelvac","MODERNMEGA","Moses","outlast","POM_Hephoof","redneck","Shaka","spankinkoala","temper","Terminator","Thelifesteeler","Valkyrie","Wasted","white knife","wjli13125","WobbleBob29","xplay0321","ZB"]),teamBluefor:new Set(["Australian Defence Force","British Armed Forces","Canadian Armed Forces","United States Army","United States Marine Corps","Turkish Land Forces","Ground Forces of Iran"]),teamOpfor:new Set(["Russian Ground Forces","Middle Eastern Alliance","Middle Eastern Insurgents","Insurgent Forces","People's Liberation Army","Russian Airborne Forces","PLA Navy Marine Corps","PLA Amphibious Ground Forces","Western Private Military Contractors"]),teamIndepend:new Set(["Western Private Military Contractors"]),adminTerms:new Set(["to the other team.",") was disbanded b","requested a list of squads.","set the next map to","changed the map to","requested the next map.",") forced","AdminRenameSquad","(Global)","executed Player Action Action","requested the current map.","restarted the match.","Squad disband - SL","was removed from their squad by Trigger.","requested layer list.","was removed from their squad by"])};let isFetching=false;function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}function injectStyle(cssText){const style=document.createElement("style");style.textContent=cssText;document.head.appendChild(style)}function pageReady(){return document.querySelector(selectors.rconLayout)||document.querySelector(selectors.rconContainer)||document.querySelector(".navbar-brand")}function isPlayerPage(){return document.querySelector(selectors.playerPage)||/^\/rcon\/players\/\d+/.test(location.pathname)}function isServerPage(){return document.querySelector(selectors.serverLayout)||/^\/rcon\/servers\/\d+/.test(location.pathname)}function addBaseStyles(){injectStyle(`
        ${selectors.ovhLogo} {
            background-color: #31e3ff21;
        }

        .copy-button-style {
            width: 140px;
            height: 40px;
            left: 10px;
            border-radius: 1em 1em 0 0;
            background-color: #2d65a5;
            color: white;
            border: none;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            position: absolute;
            top: 100px;
            z-index: 99999;
        }

        .copy-button-style:hover {
            background-color: #0077ff;
        }

        .open-url-button-style {
            width: 140px;
            height: 25px;
            left: 10px;
            border-radius: 0 0 1em 1em;
            background-color: #e5a411;
            color: white;
            border: none;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            position: absolute;
            top: 140px;
            z-index: 99999;
        }

        .open-url-button-style:hover {
            background-color: #ffb500;
        }
    `)}function cornerButtons(){if(document.getElementById("liq-corner-buttons"))return;const buttons=[{id:"NPFbutton",label:"N",url:"https://www.battlemetrics.com/rcon/servers/7871746",backgroundColor:"#187E00"},{id:"TRbutton",label:"T",url:"https://www.battlemetrics.com/rcon/servers/7894269",backgroundColor:"orange"},{id:"ban",label:"B",url:"https://www.battlemetrics.com/rcon/bans?filter%5Borganization%5D=17085&filter%5Bexpired%5D=true",backgroundColor:"red"},{id:"lanes",label:"M",url:"https://squadmaps.com/",backgroundColor:"#7E6900"},{id:"version",label:version,url:"https://raw.githubusercontent.com/liquid-gaming/bm-userscript/main/bm-toolkit-desktop.user.js",backgroundColor:"black",fontSize:"6pt"}];const buttonContainer=document.createElement("div");buttonContainer.id="liq-corner-buttons";buttonContainer.style=`
        position: fixed;
        top: 82px;
        right: 12px;
        z-index: 99999;
        display: flex;
        gap: 4px;
        padding: 4px;
        background: rgba(0, 0, 0, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
    `;document.body.appendChild(buttonContainer);buttons.forEach(({id,label,url,backgroundColor,fontSize})=>{const button=document.createElement("input");button.type="button";button.id=id;button.value=label;button.title=url;button.style=`
            width: 32px;
            height: 24px;
            padding: 1px;
            font-size: ${fontSize||"8pt"};
            font-weight: bold;
            color: white;
            background: ${backgroundColor};
            border: 1px solid rgba(255, 255, 255, 0.45);
            border-radius: 2px;
            cursor: pointer;
        `;button.onclick=()=>window.open(url,"_blank");buttonContainer.appendChild(button)})}function applyTimeStamps(){document.querySelectorAll(selectors.timestamps).forEach(element=>{const utcTime=element.getAttribute("datetime");if(!utcTime)return;const date=new Date(utcTime);if(!isNaN(date.getTime())){element.title=date.toLocaleString(undefined,{timeZoneName:"short"})}})}function applyColor(elements,phrases,color){elements.forEach(element=>{for(const phrase of phrases){if(element.textContent.includes(phrase)){element.style.color=color;break}}})}function adminApplyColor(elements,phrases,color){elements.forEach(el=>{phrases.forEach(phrase=>{const safePhrase=phrase.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const regex=new RegExp(`(\\b${safePhrase}\\b)|(\\b『LiQ』 ?${safePhrase}\\b)`,"i");if(regex.test(el.textContent)){el.style.color=color}})})}function getActivityElements(){const stableItems=document.querySelectorAll(selectors.activityItems);if(stableItems.length){return stableItems}return[...document.querySelectorAll("li, tr, article, [class]")].filter(el=>{const text=el.textContent?.trim()||"";const looksLikeLogEntry=text.includes(" was kicked ")||text.includes(" was warned ")||text.includes(" was banned ")||text.includes(" joined the server")||text.includes(" left the server")||text.includes(" team killed ")||text.includes(" requested ")||text.includes(" changed the map ")||text.includes(" set the next map ")||text.includes(" restarted the match")||text.includes("Trigger added flag");return looksLikeLogEntry&&text.length<800})}function logColoring(){const activityItems=getActivityElements();const playerLinks=document.querySelectorAll(selectors.playerLinks);adminApplyColor(playerLinks,sets.adminList,colors.cAdminName);adminApplyColor(activityItems,sets.adminList,colors.cAdminName);applyColor(activityItems,sets.adminTerms,colors.cAdminAction);applyColor(activityItems,sets.actionList,colors.cModAction);applyColor(activityItems,sets.grayedOut,colors.cGrayed);applyColor(activityItems,sets.joinedServer,colors.cJoined);applyColor(activityItems,sets.leftServer,colors.cLeftServer);applyColor(activityItems,sets.teamBluefor,colors.cTeamBluefor);applyColor(activityItems,sets.teamOpfor,colors.cTeamOpfor);applyColor(activityItems,sets.teamIndepend,colors.cTeamIndepend);applyColor(activityItems,sets.teamKilled,colors.cTeamKilled);applyColor(activityItems,sets.trackedTriggers,colors.cTracked);[...document.querySelectorAll("span, div, strong")].filter(el=>el.children.length===0&&el.textContent.trim()==="Admin").forEach(el=>{el.style.color=colors.cbmAdmin});document.querySelectorAll("i, svg, span.glyphicon").forEach(element=>{const label=(element.getAttribute("title")||element.getAttribute("aria-label")||element.closest("[title]")?.getAttribute("title")||element.closest("[aria-label]")?.getAttribute("aria-label")||"").toLowerCase();if((label.includes("note")||label.includes("flag"))&&element.textContent.trim().length<3){element.style.color=colors.cNoteColorIcon}})}function getInnerTextByTitle(titlePart,defaultValue){return document.querySelector(`[title*="${titlePart}"]`)?.innerText||defaultValue}function copyToClipboard(text){const textarea=document.createElement("textarea");textarea.style.position="fixed";textarea.style.opacity="0";textarea.value=text;document.body.appendChild(textarea);textarea.select();document.execCommand("copy");document.body.removeChild(textarea)}function ensureElementExists(elementId,creationFunction){if(!document.getElementById(elementId)){creationFunction()}}function removeElementById(elementId){const element=document.getElementById(elementId);if(element)element.remove()}function createCopyButtons(){const copyButton=document.createElement("button");copyButton.id="copy-button";copyButton.textContent="Copy Player Info";copyButton.classList.add("copy-button-style");const openURLButton=document.createElement("button");openURLButton.id="open-url-button";openURLButton.textContent="Open CBL";openURLButton.classList.add("open-url-button-style");document.body.appendChild(copyButton);document.body.appendChild(openURLButton);copyButton.addEventListener("click",()=>{const pSteamID=getInnerTextByTitle("765","SteamID MISSING?");const pEOSID=getInnerTextByTitle("0002","");const pName=document.querySelector(selectors.playerName)?.innerText||"NAME MISSING?";const textToCopy=`**User:** ${pName}\n`+`**IDs:** ${pSteamID} // ${pEOSID}\n`+`**BM Link:** ${window.location.href}\n`+`**Server:**\n`+`**Infraction:**\n`+`**Evidence Linked Below:**`;copyToClipboard(textToCopy)});openURLButton.addEventListener("click",()=>{const pSteamID=getInnerTextByTitle("765","SteamID MISSING?");if(pSteamID&&pSteamID!=="SteamID MISSING?"){window.open(`https://communitybanlist.com/search/${pSteamID}`,"_blank")}else{alert("SteamID is missing or invalid!")}})}function playerPageTools(){if(isPlayerPage()){ensureElementExists("copy-button",createCopyButtons);ensureElementExists("CBL-info",runDataFetching)}else{removeElementById("copy-button");removeElementById("open-url-button");removeElementById("CBL-info")}}const graphqlEndpoint="https://communitybanlist.com/graphql";async function runDataFetching(){if(isFetching)return;const pSteamID=getInnerTextByTitle("765","SteamID MISSING?");if(!pSteamID||pSteamID==="SteamID MISSING?")return;try{isFetching=true;await fetchSteamUserData(pSteamID)}catch(error){console.error("Error fetching Steam user data:",error)}finally{isFetching=false}}async function fetchSteamUserData(steamID){await sleep(500);const maxRetries=1;const retryDelay=3e3;let attempt=0;while(attempt<maxRetries){try{attempt++;const response=await fetch(graphqlEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:`
                        query Search($id: String!) {
                            steamUser(id: $id) {
                                riskRating
                                activeBans: bans(orderBy: "created", orderDirection: DESC, expired: false) {
                                    edges { node { id } }
                                }
                                expiredBans: bans(orderBy: "created", orderDirection: DESC, expired: true) {
                                    edges { node { id } }
                                }
                            }
                        }
                    `,variables:{id:steamID}})});if(!response.ok){throw new Error(`HTTP error ${response.status}`)}const data=await response.json();const user=data?.data?.steamUser;if(!user){throw new Error("Invalid response or user not found.")}const riskRating=user.riskRating||"None?";const activeBansCount=user.activeBans?.edges?.length||0;const expiredBansCount=user.expiredBans?.edges?.length||0;displayUserData(riskRating,activeBansCount,expiredBansCount);return}catch(error){console.error(`CBL fetch attempt ${attempt} failed:`,error);if(attempt<maxRetries){await sleep(retryDelay)}else{displayUserData("None?","?","?")}}}}function displayUserData(riskRating,activeBansCount,expiredBansCount){removeElementById("CBL-info");const CBL=document.createElement("div");CBL.id="CBL-info";CBL.style=`
        width: 140px;
        height: 120px;
        left: 10px;
        top: 170px;
        background: #000000bd;
        color: white;
        border: none;
        border-radius: 15%;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        padding: 2px;
        position: absolute;
        text-align: center;
        z-index: 99998;
    `;let riskColor="white";let displayRisk=riskRating;if(riskRating>=1&&riskRating<=5){riskColor="orange";displayRisk=`${riskRating}/10`}else if(riskRating>5){riskColor="red";displayRisk=`${riskRating}/10`}CBL.innerHTML=`
        <h4 style="font-size: 1.2em; font-weight: bold; color: ${riskColor};">CBL Rating</h4>
        <h4 style="font-size: 1em; font-weight: bold; color: ${riskColor};">${displayRisk}</h4>
        <h4 style="font-size: 12px; font-weight: bold;">Active Bans: ${activeBansCount}</h4>
        <h4 style="font-size: 12px; font-weight: bold;">Expired Bans: ${expiredBansCount}</h4>
    `;document.body.appendChild(CBL)}function colorServerCommandMenu(){document.querySelectorAll(selectors.serverCommandButtons).forEach(button=>{const text=button.textContent.trim();if(text.includes("Warn"))button.style.color="lime";if(text.includes("Kick"))button.style.color="orange";if(text.includes("Ban"))button.style.color="red";if(text.includes("Force Team Change"))button.style.color="#db4dff";if(text.includes("Remove Player from Squad"))button.style.color="#804d00";if(text.includes("Action - Reset Squad Name"))button.style.color="gold";if(text.includes("Set Next Layer")||text.includes("Next Layer")){button.style.color="lime";button.style.fontSize="16pt"}if(text.includes("Change Layer")){button.style.color="red";button.style.fontWeight="bold"}if(text.includes("Squad List")){button.style.color="gold";button.style.fontSize="16pt"}})}function colorDialogMenus(){const dialogItems=document.querySelectorAll('.modal-title, [role="dialog"] button, [role="dialog"] a, .modal button, .modal a');dialogItems.forEach(el=>{const text=el.textContent.trim();if(text.includes("Change Layer")){el.style.color="red";el.style.fontWeight="bold";el.style.textAlign="center";el.style.fontSize="200pt"}if(text.includes("Set Next Layer")||text.includes("Next Layer")){el.style.color="lime";el.style.fontWeight="bold";el.style.textAlign="center";el.style.fontSize="24pt"}if(text.includes("Kick")){el.style.color="orange";el.style.fontWeight="bold";el.style.textAlign="center";el.style.fontSize="48pt"}if(text.includes("Warn")){el.style.color="lime";el.style.fontWeight="bold";el.style.textAlign="center";el.style.fontSize="24pt"}if(text.includes("Ban")){el.style.color="red";el.style.fontWeight="bold"}if(text.includes("Squad List")){el.style.color="gold"}if(text.includes("Force Team Change")){el.style.color="#db4dff"}if(text.includes("Remove Player from Squad")){el.style.color="#804d00"}if(text.includes("Action - Reset Squad Name")){el.style.color="gold"}})}async function updateLogic(){if(!pageReady())return;applyTimeStamps();logColoring();playerPageTools();if(isServerPage()){colorServerCommandMenu()}colorDialogMenus()}function runCode(){console.log("BattleMetrics toolkit started.");addBaseStyles();cornerButtons();setInterval(updateLogic,updateRate)}function observeDOMChanges(){const observer=new MutationObserver(()=>{if(pageReady()){observer.disconnect();runCode()}});observer.observe(document.body,{childList:true,subtree:true,attributes:true})}observeDOMChanges();
