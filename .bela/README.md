# Integração BELA

Este diretório contém a configuração local da sincronização arquitetural do CONDSTORE com o BELA.

O arquivo `bela-update.ecd` é gerado pelo updater oficial durante a execução e não deve ser editado manualmente. O arquivo é ignorado pelo Git porque pode conter metadados derivados do código privado; o workflow o utiliza apenas como artefato temporário para upload.

A integração usa `juxhouse/bela-updater-typescript`, com o código montado em modo somente leitura e a rede do container desabilitada.
