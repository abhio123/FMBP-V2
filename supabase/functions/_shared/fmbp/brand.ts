/**
 * The public name and the company details, in one place. The app, the website (fmbp.app), the information pages
 * (About, Terms, Privacy, Contact) and the server texts read them from here. Change a value here and run
 * `pnpm sync:shared` (it copies this file to the server functions).
 *
 * Keep each value on its own line as `key: "value",`: apps/mobile/app.config.js reads appName and supportEmail from
 * this file when an app build is made.
 *
 * Colours and the logo files are in apps/mobile/brand.config.js.
 */
export const BRAND = {
  /** The app's name wherever people see it: home screen, store listing, texts, website. */
  appName: "Find My Business Partner",
  /** Support address (in the app, on the website and in the store listing). */
  supportEmail: "support@fmbp.app",
  /** The website the app's share links open. */
  websiteUrl: "https://fmbp.app",
} as const;

/**
 * The company behind the app. The law requires these to be published before launch: the Information Technology
 * Rules 2021 (grievance officer) and the store listings (who provides the app). Both stores check them.
 *
 * SAMPLE DATA: replace every value, then set `isSample` to false. While it is true, the information pages show a note
 * that the details are not final.
 */
export const COMPANY = {
  isSample: true,
  legalName: "Sample Business Solutions Private Limited",
  registeredAddress: "Office 101, Sample Tower, Sector 62, Noida, Uttar Pradesh 201301, India",
  /** Courts that handle disputes about the Terms (usually the city of the registered office). */
  jurisdictionCity: "Noida",
  grievanceOfficerName: "Sample Name",
  grievanceOfficerEmail: "grievance@fmbp.app",
  grievanceOfficerAddress: "Office 101, Sample Tower, Sector 62, Noida, Uttar Pradesh 201301, India",
} as const;

/** Every {{appName}} and company placeholder in a text, filled in. `{{supportEmail}}` is left for the screen that shows it (the app and the website each have their own setting). */
export function fillBrand(text: string): string {
  const values: Record<string, string> = {
    appName: BRAND.appName, companyName: COMPANY.legalName, companyAddress: COMPANY.registeredAddress,
    jurisdictionCity: COMPANY.jurisdictionCity, grievanceName: COMPANY.grievanceOfficerName, grievanceEmail: COMPANY.grievanceOfficerEmail,
    grievanceAddress: COMPANY.grievanceOfficerAddress,
  };
  return text.replace(/\{\{(\w+)\}\}/g, (all, key: string) => values[key] ?? all);
}
