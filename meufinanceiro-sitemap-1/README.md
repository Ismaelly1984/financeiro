# MeuFinanceiro Sitemap Generator

Este projeto é um gerador de sitemap para o site "MeuFinanceiro". Ele permite a criação de um sitemap em formato XML, que pode ser utilizado para melhorar a indexação do site nos motores de busca.

## Estrutura do Projeto

- **src/**: Contém o código-fonte do gerador de sitemap.
  - **index.js**: Ponto de entrada da aplicação.
  - **generator.js**: Função que gera o sitemap com base na configuração.
  - **config/**: Contém o arquivo de configuração do sitemap.
    - **sitemap.config.js**: Configurações como URL base, frequência de atualizações e prioridade.
  - **templates/**: Contém o template do sitemap em XML.
    - **sitemap.xml.tpl**: Estrutura do sitemap com placeholders.
  - **utils/**: Funções utilitárias.
    - **url-extractor.js**: Função para extrair URLs de uma fonte.

- **tests/**: Contém os testes unitários.
  - **generator.test.js**: Testes para a função de geração de sitemap.

- **scripts/**: Scripts auxiliares.
  - **build-sitemap.sh**: Script para automatizar o processo de construção do sitemap.

- **.gitignore**: Arquivo que especifica quais arquivos devem ser ignorados pelo Git.

- **package.json**: Configuração do npm, incluindo dependências e scripts.

- **README.md**: Documentação do projeto.

- **LICENSE**: Informações sobre a licença do projeto.

## Instalação

1. Clone o repositório:
   ```
   git clone <URL do repositório>
   ```

2. Navegue até o diretório do projeto:
   ```
   cd meufinanceiro-sitemap
   ```

3. Instale as dependências:
   ```
   npm install
   ```

## Uso

Para gerar o sitemap, execute o seguinte comando:
```
node src/index.js
```

Isso irá gerar um arquivo `sitemap.xml` na raiz do projeto, com base nas URLs extraídas e nas configurações definidas.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir um pull request ou relatar problemas.

## Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo LICENSE para mais detalhes.