"use client";

import { API_BASE_URL } from "@plane/constants";
import { EPageTypes } from "@/helpers/authentication.helper";
import DefaultLayout from "@/layouts/default-layout";
import { AuthenticationWrapper } from "@/lib/wrappers/authentication-wrapper";
import microsoftLogo from "@/app/assets/logos/microsoft-logo.svg?url";

function SignUpPage() {
  const handleMicrosoftLogin = () => {
    window.location.assign(`${API_BASE_URL}/auth/microsoft/`);
  };

  return (
    <DefaultLayout>
      <AuthenticationWrapper pageType={EPageTypes.NON_AUTHENTICATED}>
        <div className="relative z-10 flex flex-col items-center justify-center w-screen h-screen overflow-hidden">
          <div className="flex flex-col items-center gap-8 p-8 rounded-xl bg-custom-background-100 shadow-lg border border-custom-border-200">
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-3xl font-bold text-custom-text-100">Plane</h1>
              <p className="text-custom-text-300">Sign in to continue</p>
            </div>

            <button
              onClick={handleMicrosoftLogin}
              className="flex items-center gap-3 px-6 py-3 rounded-lg bg-[#2F2F2F] hover:bg-[#404040] transition-colors text-white font-medium min-w-[280px] justify-center"
            >
              <img src={microsoftLogo} height={20} width={20} alt="Microsoft Logo" />
              <span>Sign in with Microsoft</span>
            </button>
          </div>
        </div>
      </AuthenticationWrapper>
    </DefaultLayout>
  );
}

export default SignUpPage;
