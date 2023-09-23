import React, { ReactNode, createContext, useContext, useState } from "react";

interface SecretKeyContextProps {
  secretKey: string | null;
  setSecretKey: (key: string) => void;
}

const SecretKeyContext = createContext<SecretKeyContextProps | undefined>(
  undefined,
);

export const useSecretKey = (): SecretKeyContextProps => {
  const context = useContext(SecretKeyContext);
  if (!context) {
    throw new Error("useSecretKey must be used within a SecretKeyProvider");
  }
  return context;
};

export const SecretKeyProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [secretKey, setSecretKey] = useState<string | null>(null);

  return (
    <SecretKeyContext.Provider value={{ secretKey, setSecretKey }}>
      {children}
    </SecretKeyContext.Provider>
  );
};
