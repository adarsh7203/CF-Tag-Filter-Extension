console.log("EXTENSION LOADED");

(async function () {
    const handle = window.location.pathname.split("/")[2];
    if (!handle) return;

    const res = await fetch(
        `https://codeforces.com/api/user.status?handle=${handle}`
    );

    const data = await res.json();
    const submissions = data.result;

    const solved = new Set();
    const tagMap = {};

    submissions.forEach(sub => {
        if (sub.verdict === "OK") {
            const key = sub.problem.contestId + "-" + sub.problem.index;

            if (!solved.has(key)) {
                solved.add(key);

                sub.problem.tags.forEach(tag => {
                    if (!tagMap[tag]) tagMap[tag] = [];
                    tagMap[tag].push(sub.problem);
                });
            }
        }
    });

    createUI(tagMap, submissions);
})();

function createUI(tagMap, submissions) {

    let sortOrder = "time";

    const container = document.createElement("div");
    container.className = "roundbox sidebox cf-tag-box";
    container.style.marginTop = "15px";

    const title = document.createElement("div");
    title.className = "caption titled cf-tag-title";
    title.innerHTML = `&rarr; Tag Filter (${Object.keys(tagMap).length})`;

    const content = document.createElement("div");
    content.className = "cf-tag-content";

    // DATE FILTERS
    const dateContainer = document.createElement("div");
    dateContainer.className = "cf-date-container";

    const startDate = document.createElement("input");
    startDate.type = "date";

    const endDate = document.createElement("input");
    endDate.type = "date";

    dateContainer.appendChild(startDate);
    dateContainer.appendChild(endDate);

    // RATING RANGE
    const ratingContainer = document.createElement("div");
    ratingContainer.className = "cf-rating-container";

    const minRating = document.createElement("input");
    minRating.type = "number";
    minRating.placeholder = "Min rating";
    minRating.style.flex = "1";

    const maxRating = document.createElement("input");
    maxRating.type = "number";
    maxRating.placeholder = "Max rating";
    maxRating.style.flex = "1";
    
    minRating.className = "cf-rating-input";
    maxRating.className = "cf-rating-input";

    ratingContainer.appendChild(minRating);
    ratingContainer.appendChild(maxRating);

    // TAG SELECT
    const select = document.createElement("select");
    select.multiple = true;
    select.className = "cf-tag-select";

    Object.keys(tagMap).sort().forEach(tag => {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        select.appendChild(option);
    });

    // BUTTON
    const button = document.createElement("button");
    button.textContent = "Apply";
    button.className = "cf-tag-button";

    // COUNT
    const countDiv = document.createElement("div");
    countDiv.style.fontWeight = "bold";
    countDiv.style.marginTop = "8px";

    // RESULT
    const result = document.createElement("div");
    result.style.marginTop = "10px";
    result.style.maxHeight = "250px";
    result.style.overflowY = "auto";

    button.onclick = () => {
        const selected = Array.from(select.selectedOptions).map(o => o.value);

        if (selected.length === 0) {
            result.innerHTML = "<i>Select at least one tag</i>";
            countDiv.innerHTML = "";
            return;
        }

        // DATE
        const start = startDate.value
            ? new Date(startDate.value).getTime() / 1000
            : 0;

        const end = endDate.value
            ? new Date(endDate.value).getTime() / 1000 + 86400
            : Infinity;

        // RATING RANGE
        const minR = minRating.value ? parseInt(minRating.value) : 0;
        const maxR = maxRating.value ? parseInt(maxRating.value) : Infinity;

        const problems = new Map();

        selected.forEach(tag => {
            (tagMap[tag] || []).forEach(p => {
                const key = p.contestId + "-" + p.index;

                const sub = submissions.find(s =>
                    s.problem.contestId === p.contestId &&
                    s.problem.index === p.index &&
                    s.verdict === "OK"
                );

                if (!sub) return;

                const time = sub.creationTimeSeconds;
                const rating = p.rating || 0;

                if (time >= start && time <= end &&
                    rating >= minR && rating <= maxR) {
                    problems.set(key, p);
                }
            });
        });

        let arr = Array.from(problems.values());

        // SORT LOGIC
        if (sortOrder === "asc") {
            arr.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        } else if (sortOrder === "desc") {
            arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }

        result.innerHTML = "";

        countDiv.innerHTML = `Showing ${arr.length} problems`;

        if (arr.length === 0) {
            result.innerHTML = "<i style='color:#888;'>No problems found</i>";
            return;
        }

        // TABLE
        const table = document.createElement("table");
        table.className = "cf-tag-table";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        // Problem
        const th1 = document.createElement("th");
        th1.textContent = "Problem";

        // Rating with arrow (CF style)
        const th2 = document.createElement("th");
        th2.style.textAlign = "right";
        th2.style.cursor = "pointer";

        const arrow = document.createElement("span");
        arrow.style.marginLeft = "4px";
        arrow.innerHTML = sortOrder === "asc" ? "▲" :
                          sortOrder === "desc" ? "▼" : "▲▼";

        th2.innerHTML = "Rating";
        th2.appendChild(arrow);

        th2.onclick = () => {
            if (sortOrder === "time") sortOrder = "asc";
            else if (sortOrder === "asc") sortOrder = "desc";
            else sortOrder = "time";

            button.click();
        };

        headerRow.appendChild(th1);
        headerRow.appendChild(th2);

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        arr.forEach(p => {
            const tr = document.createElement("tr");

            const td1 = document.createElement("td");
            const link = document.createElement("a");
            link.href = `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;
            link.textContent = `${p.index}. ${p.name}`;
            link.target = "_blank";
            td1.appendChild(link);

            const td2 = document.createElement("td");
            td2.textContent = p.rating ? p.rating : "?";
            td2.style.textAlign = "right";
            td2.style.color = "#888";

            tr.appendChild(td1);
            tr.appendChild(td2);

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        result.appendChild(table);
    };

    content.appendChild(dateContainer);
    content.appendChild(ratingContainer);
    content.appendChild(select);
    content.appendChild(button);
    content.appendChild(countDiv);
    content.appendChild(result);

    container.appendChild(title);
    container.appendChild(content);

    const statusBox = document.querySelector(".status-filter");

    if (statusBox && statusBox.parentNode) {
        statusBox.parentNode.insertBefore(container, statusBox.nextSibling);
    }
}