export default class GlobalData {

  mainUrl:string;

  constructor() {
    let url = process.env.MAIN_URL || "https://bettervoting.com";
    if (url.endsWith('/')) url = url.slice(0, -1);
    this.mainUrl = url;
  }
}