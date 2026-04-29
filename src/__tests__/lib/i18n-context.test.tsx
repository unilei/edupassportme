import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider, useI18n } from "@/lib/i18n/context";

function Probe() {
  const { locale, t } = useI18n();
  return <div>{`${locale}:${t("nav.courses")}`}</div>;
}

describe("I18nProvider", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.cookie = "NEXT_LOCALE=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  });

  it("uses the server locale for the initial render even when client storage differs", () => {
    window.localStorage.setItem("edupassport-locale", "en");
    document.cookie = "NEXT_LOCALE=en;path=/";

    render(
      <I18nProvider initialLocale="zh">
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByText("zh:课程")).toBeInTheDocument();
  });
});
