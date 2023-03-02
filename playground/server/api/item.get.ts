import { H3Event } from "h3";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default eventHandler(async (event: H3Event) => {
  await sleep(1000); // Make the request slower on purpose to show fetching indicator on the page.
  const data = new Date().getTime();
  console.log("API: ", data);
  return { a: data };
});
