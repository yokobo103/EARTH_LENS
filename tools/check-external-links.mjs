const links = [
  { label: "TeleGeography Submarine Cable Map", url: "https://www.submarinecablemap.com/" },
  { label: "TeleGeography Submarine Cable FAQs", url: "https://www2.telegeography.com/submarine-cable-faqs-frequently-asked-questions" },
  { label: "Choke point · Wikipedia", url: "https://en.wikipedia.org/wiki/Choke_point" },
];

let failed = 0;
for (const link of links) {
  try {
    let response = await fetch(link.url, { method: "HEAD", redirect: "follow" });
    if (!response.ok || response.status === 405) response = await fetch(link.url, { method: "GET", redirect: "follow" });
    const status = `${response.status} ${response.statusText}`;
    if (response.ok) console.log(`OK  ${status.padEnd(18)} ${link.label} · ${response.url}`);
    else { failed += 1; console.error(`BAD ${status.padEnd(18)} ${link.label} · ${link.url}`); }
  } catch (error) {
    failed += 1;
    console.error(`ERR ${(error instanceof Error ? error.message : String(error)).padEnd(18)} ${link.label} · ${link.url}`);
  }
}

if (failed) {
  console.error(`\n${failed} external link(s) need review.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${links.length} external guide links responded successfully.`);
}
