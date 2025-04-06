"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  // Rediriger vers le dashboard si déjà connecté
  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard");
    }
  }, [isConnected, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            AgoraDAO
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Gouvernance décentralisée pour des projets humanitaires
          </p>
        </div>

        <Card className="p-8 bg-gray-800/50 backdrop-blur border-gray-700">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-white">
                Bienvenue sur AgoraDAO
              </h2>
              <p className="text-gray-400 mt-2">
                Connectez votre portefeuille pour accéder à la plateforme
              </p>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-xs">
                <ConnectButton.Custom>
                  {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    openConnectModal,
                    mounted,
                  }) => {
                    const ready = mounted;
                    const connected = ready && account && chain;

                    return (
                      <div
                        {...(!ready && {
                          "aria-hidden": true,
                          style: {
                            opacity: 0,
                            pointerEvents: "none",
                            userSelect: "none",
                          },
                        })}
                        className="w-full"
                      >
                        {(() => {
                          if (!connected) {
                            return (
                              <Button
                                onClick={openConnectModal}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                              >
                                Connecter portefeuille
                              </Button>
                            );
                          }

                          if (chain.unsupported) {
                            return (
                              <Button
                                onClick={openChainModal}
                                className="w-full bg-red-600 hover:bg-red-700"
                              >
                                Réseau non supporté
                              </Button>
                            );
                          }

                          return (
                            <div className="flex gap-3">
                              <Button
                                onClick={openAccountModal}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {account.displayName}
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>

              <div className="text-sm text-gray-400 text-center max-w-xs">
                En vous connectant, vous acceptez de participer à notre DAO et
                d&apos;utiliser les contrats intelligents du réseau.
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <InfoCard
            title="Proposez"
            description="Soumettez des propositions de financement pour des projets humanitaires"
            icon="📝"
          />
          <InfoCard
            title="Votez"
            description="Participez aux décisions en votant sur les propositions actives"
            icon="🗳️"
          />
          <InfoCard
            title="Financez"
            description="Faites un don en ETH et recevez des tokens de gouvernance"
            icon="💰"
          />
        </div>
      </div>
    </main>
  );
}

function InfoCard({ title, description, icon }) {
  return (
    <Card className="p-6 bg-gray-800/30 backdrop-blur border-gray-700 hover:bg-gray-800/50 transition-all">
      <div className="text-center space-y-3">
        <div className="text-4xl">{icon}</div>
        <h3 className="text-xl font-medium text-white">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </Card>
  );
}
