'use strict'

const { Client } = require('@elastic/elasticsearch')
const cheerio = require('cheerio')

async function indexSite (pages, index_name='test-index') {
  const client = new Client({ node: 'http://localhost:9200' })
  var result

  // console.log('deleting index')
  result = await client.indices.delete({
    index: index_name,
    ignore_unavailable: true,
  })
  // console.log(result)

  function getMultiDef (name) {
    var def = {
      type: 'text',
      fields: {
        raw: {
          type: 'keyword',
        },
      },
    }

    return def
  }

  try {
    // console.log('creating index')
    result = await client.indices.create({
      index: index_name,
      body: {
        settings: {
          index: {
            analysis: {
              //analyzer: {
              char_filter: {
                replace: {
                  type: 'mapping',
                  mappings: [
                    '&=> and ',
                  ],
                },
              },
              filter: {
                word_delimiter: {
                  type: 'word_delimiter',
                  split_on_numerics: false,
                  split_on_case_change: true,
                  generate_word_parts: true,
                  generate_number_parts: true,
                  catenate_all: true,
                  preserve_original: true,
                  catenate_numbers: true,
                },
              },
              analyzer: {
                default: {
                  type: 'custom',
                  char_filter: [
                    'html_strip',
                    'replace',
                  ],
                  tokenizer: 'whitespace',
                  filter: [
                    'lowercase',
                    'word_delimiter',
                  ],
                },
              },
              //},
            },
          },
        },
        mappings: {
          properties: {
            version: getMultiDef('version'),
            module: getMultiDef('module'),
            component: getMultiDef('component'),
          },
        },
      },
    })
    // console.log(result)
  } catch (err) {
    console.log(err)
    console.log(err.body.error)
    return
  }

  for (let page of pages) {
    // console.log(page.src.path + '@' + page.src.version)
    // promise API
    var article = cheerio.load(page.contents)('article')
    var extractContent = article.text()
    var documentTitle = article.find('h1').text()
    result = await client.index({
      index: index_name,
      id: page.src.version + '@' + page.src.path,
      type: '_doc',
      body: {
        version: page.src.version,
        path: page.src.path,
        module: page.src.module,
        name: page.src.stem,
        title: documentTitle,
        url: page.pub.url,
        component: page.src.component,
        content: extractContent },
    })

    // console.log(result)
  }
}

module.exports = indexSite
