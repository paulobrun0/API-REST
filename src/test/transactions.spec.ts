/* eslint-disable camelcase */
import { expect, it, beforeAll, afterAll, describe, beforeEach } from 'vitest'
import { execSync } from 'node:child_process'
import request from 'supertest'
import { app } from '../app'

describe('Transactions Routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('Should be able to create a new transaction', async () => {
    await request(app.server)
      .post('/transactions')
      .send({
        title: 'New Transaction',
        amount: 5000,
        type: 'credit',
      })
      .expect(201)
  })

  it('Should be able to list all transactions', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New Transaction',
        amount: 5000,
        type: 'credit',
      })

    const cookies = createTransactionResponse.get('Set-Cookie') || []

    const listTransactionsReponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    expect(listTransactionsReponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'New Transaction',
        amount: 5000,
      }),
    ])
  })

  it('Should be able to list a specific transaction', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New Transaction',
        amount: 5000,
        type: 'credit',
      })

    const cookies = createTransactionResponse.get('Set-Cookie') || []

    const listTransactionsReponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const transactionId = listTransactionsReponse.body.transactions[0].id

    const getTransactionsReponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getTransactionsReponse.body.transaction).toEqual(
      expect.objectContaining({
        title: 'New Transaction',
        amount: 5000,
      }),
    )
  })

  it('Should be able to get the summary s', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New Transaction',
        amount: 5000,
        type: 'credit',
      })

    const cookies = createTransactionResponse.get('Set-Cookie') || []

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({
        title: 'Debit Transaction',
        amount: 3000,
        type: 'debit',
      })

    const summaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(200)

    expect(summaryResponse.body.summary).toEqual({
      amount: 2000,
    })
  })

  it('Should be able to delete a specific transaction', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'Fatura do cartao',
        amount: 1000,
        type: 'debit',
      })

    const cookies = createTransactionResponse.get('Set-Cookie') || []

    const listTransactionsReponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const transactionId = listTransactionsReponse.body.transactions[0].id

    await request(app.server)
      .delete(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200)

    const listAfterDeleteResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const deletedTransaction = listAfterDeleteResponse.body.transactions.find(
      (t: { id: string }) => t.id === transactionId,
    )

    expect(deletedTransaction).toBeUndefined()
  })

  it('Should be able to edit a specific transaction title', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'Fatura do cartao',
        amount: -1000,
        type: 'debit',
      })

    const cookies = createTransactionResponse.get('Set-Cookie') || []

    const listTransactionsReponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const { id, created_at, session_id, amount } =
      listTransactionsReponse.body.transactions[0]

    await request(app.server)
      .patch(`/transactions/${id}`)
      .set('Cookie', cookies)
      .send({
        title: 'Despesas médicas',
      })
      .expect(204)

    const updatedTransactionResponse = await request(app.server)
      .get(`/transactions/${id}`) // Consulta a transação atualizada
      .set('Cookie', cookies)
      .expect(200)

    expect(updatedTransactionResponse.body.transaction).toEqual({
      id,
      title: 'Despesas médicas',
      amount,
      created_at,
      session_id,
    })
  })
})
